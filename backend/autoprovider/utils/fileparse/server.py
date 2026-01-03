# 禁用dotenv自动加载，避免编码错误
import os
os.environ['FLASK_SKIP_DOTENV'] = '1'

from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import uuid
import tempfile
from datetime import datetime
from io import BytesIO
from PIL import Image
import jwt
from functools import wraps

# 导入自定义模块
from upload7niu import (
    upload_image_to_qiniu,
    test_qiniu_connection,
    QINIU_DOMAIN,
    QINIU_BUCKET_NAME
)
from parsedoc import (
    safe_convert_document,
    count_image_placeholders
)
from parseimg import parse_image_with_ai
import json

app = Flask(__name__)

# 配置CORS，允许所有域名访问
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# 建立临时文件夹（仅用于docling解析过程）
docTemporaryFolder = './doc_temporary'
if not os.path.exists(docTemporaryFolder):
    os.makedirs(docTemporaryFolder, exist_ok=True)

# JWT配置（需要与Node.js后端保持一致）
JWT_SECRET_KEY = 'autoprovider_secret_2025'  # 请确保与Node.js的JWT密钥一致
JWT_ALGORITHM = 'HS256'

# 文件上传配置
UPLOAD_FOLDER = docTemporaryFolder
MAX_CONTENT_LENGTH = 30 * 1024 * 1024  # 30MB
MAX_FILES_PER_REQUEST = 10  # 单次请求最多上传10个文件
MIN_FILE_SIZE = 100  # 最小文件大小 100 bytes

# 文件格式分类
DOCUMENT_EXTENSIONS = {
    'pptx', 'doc', 'docx', 'xlx', 'xlsx', 'md', 'txt', 
    'html', 'csv', 'json', 'pdf'
}

IMAGE_EXTENSIONS = {
    'png', 'jpg', 'jpeg', 'tiff', 'tif', 'bmp', 'gif', 'webp'
}

ALLOWED_EXTENSIONS = DOCUMENT_EXTENSIONS | IMAGE_EXTENSIONS

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# MySQL数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '123456',
    'database': 'autoprovider',
    'charset': 'utf8mb4'
}


# ==================== 工具函数 ====================

def allowed_file(filename):
    """检查文件扩展名是否被允许"""
    if not filename or '.' not in filename:
        return False
    return filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_file_type(filename):
    """
    判断文件类型
    :param filename: 文件名
    :return: 'document', 'image', 'unknown'
    """
    if not filename:
        return 'unknown'
    
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    if ext in DOCUMENT_EXTENSIONS:
        return ext  # 返回具体的文件扩展名
    elif ext in IMAGE_EXTENSIONS:
        return ext  # 返回具体的文件扩展名
    else:
        return 'unknown'


def validate_file_size(file_size):
    """
    验证文件大小
    :param file_size: 文件大小（字节）
    :return: (is_valid, error_message)
    """
    if file_size < MIN_FILE_SIZE:
        return False, f'文件太小，最小需要{MIN_FILE_SIZE}字节'
    
    if file_size > MAX_CONTENT_LENGTH:
        return False, f'文件太大，最大允许{MAX_CONTENT_LENGTH/1024/1024:.1f}MB'
    
    return True, ''


def validate_image_file(file_content):
    """
    验证图片文件是否有效
    :param file_content: 文件内容
    :return: (is_valid, error_message, width, height)
    """
    try:
        image = Image.open(BytesIO(file_content))
        width, height = image.size
        
        # 验证图片尺寸
        if width < 10 or height < 10:
            return False, '图片尺寸太小，最小需要10x10像素', 0, 0
        
        if width > 10000 or height > 10000:
            return False, '图片尺寸太大，最大支持10000x10000像素', 0, 0
        
        return True, '', width, height
    except Exception as e:
        return False, f'无效的图片文件: {str(e)}', 0, 0


# ==================== Token验证中间件 ====================

def verify_token(f):
    """
    Token验证装饰器
    验证请求头中的Authorization token
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # 从请求头获取token
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            # 格式: "Bearer <token>"
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
            else:
                token = auth_header
        
        # 如果没有token
        if not token:
            print("❌ Token验证失败: 未提供token")
            return jsonify({
                'status': 1,
                'message': '未提供身份验证令牌，请先登录',
                'data': 'fail'
            }), 401
        
        try:
            # 验证token
            print(f"🔐 正在验证Token: {token[:20]}...")
            print(f"   使用密钥: {JWT_SECRET_KEY}")
            print(f"   使用算法: {JWT_ALGORITHM}")
            
            # 解码token
            decoded = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            # 打印解码后的内容，用于调试
            print(f"   解码成功，payload内容: {decoded}")
            
            # 将用户信息添加到请求上下文
            # Node.js生成的token只包含user_id字段
            request.user_id = decoded.get('user_id') or decoded.get('id')
            request.username = decoded.get('username') or decoded.get('user_id', 'unknown')
            
            if not request.user_id:
                print(f"❌ Token中缺少user_id字段")
                return jsonify({
                    'status': 1,
                    'message': 'Token格式错误，缺少用户ID',
                    'data': 'fail'
                }), 401
            
            print(f"✅ Token验证成功: user_id={request.user_id}, username={request.username}")
            
        except jwt.ExpiredSignatureError:
            print("❌ Token验证失败: token已过期")
            return jsonify({
                'status': 1,
                'message': '身份验证令牌已过期，请重新登录',
                'data': 'fail'
            }), 401
        except jwt.InvalidTokenError as e:
            print(f"❌ Token验证失败: InvalidTokenError")
            print(f"   错误详情: {str(e)}")
            print(f"   Token内容: {token}")
            return jsonify({
                'status': 1,
                'message': '无效的身份验证令牌，请重新登录',
                'data': 'fail'
            }), 401
        except Exception as e:
            print(f"❌ Token验证异常: {type(e).__name__}")
            print(f"   错误详情: {str(e)}")
            import traceback
            print(f"   堆栈跟踪:\n{traceback.format_exc()}")
            return jsonify({
                'status': 1,
                'message': '身份验证失败，请重新登录',
                'data': 'fail'
            }), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


def decode_text_content(file_bytes):
    """
    尝试以utf-8优先解码文本，失败则宽容解码
    """
    try:
        return file_bytes.decode('utf-8')
    except Exception:
        try:
            return file_bytes.decode('utf-8', errors='replace')
        except Exception:
            return file_bytes.decode(errors='replace')


def fallback_parse_plain(file_content, file_type):
    """
    非结构化文本类文件的兜底解析
    """
    text = decode_text_content(file_content)
    if file_type in {'json'}:
        try:
            obj = json.loads(text)
            return json.dumps(obj, indent=2, ensure_ascii=False)
        except Exception:
            return text
    # csv/html/markdown/txt等直接返回文本
    return text


# ==================== 数据库操作函数 ====================

def get_db_connection():
    """数据库连接函数"""
    try:
        connection = pymysql.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return None


def insert_source_to_db(source_content, source_type, project_id=None, source_url='', own_user_id=None, file_size=None, session_id=None, dialogue_id=None, source_name=None):
    """
    插入资源到source_list表
    :param source_content: 资源内容（解析后的文本或AI描述）
    :param source_type: 资源类型（文件扩展名，如pdf、docx、png等）
    :param project_id: 项目ID（可选）
    :param source_url: 资源URL（图片才有，文档为空）
    :param own_user_id: 上传用户ID
    :param file_size: 文件大小（字节，字符串存储）
    :param session_id: 会话ID（可选）
    :param dialogue_id: 对话ID（可选）
    :param source_name: 资源名称（原始文件名或生成名）
    :return: 插入成功返回source_id，失败返回None
    """
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        with connection.cursor() as cursor:
            # 生成资源ID（使用UUID）
            source_id = str(uuid.uuid4())
            
            sql = """
            INSERT INTO source_list 
            (source_id, source_url, source_type, project_id, source_status, create_time, source_content, own_user_id, file_size, dialogue_id, session_id, source_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            current_time = datetime.now()
            cursor.execute(sql, (
                source_id,
                source_url,
                source_type,
                project_id,
                0,  # source_status 默认为0（正常使用）
                current_time,
                source_content,
                own_user_id,
                str(file_size) if file_size is not None else None,
                dialogue_id,
                session_id,
                source_name
            ))
            
            connection.commit()
            
            print(f"资源成功插入数据库，source_id: {source_id}, type: {source_type}, project_id: {project_id}")
            return source_id
            
    except Exception as e:
        print(f"插入数据库失败: {e}")
        connection.rollback()
        return None
    finally:
        connection.close()


def check_project_exists(project_id):
    """
    检查项目是否存在
    :param project_id: 项目ID
    :return: True/False
    """
    if not project_id:
        return True  # 如果没有传project_id，不需要检查
    
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        with connection.cursor() as cursor:
            sql = "SELECT COUNT(*) FROM project_info WHERE project_id = %s AND project_status = 0"
            cursor.execute(sql, (project_id,))
            result = cursor.fetchone()
            return result[0] > 0
    except Exception as e:
        print(f"检查项目是否存在失败: {e}")
        return False
    finally:
        connection.close()


def check_project_permission(project_id, user_id):
    """
    校验项目归属：仅允许项目作者上传
    :param project_id: 项目ID
    :param user_id: 当前登录用户ID
    :return: True/False
    """
    if not project_id or not user_id:
        return False

    connection = get_db_connection()
    if not connection:
        return False

    try:
        with connection.cursor() as cursor:
            sql = """
            SELECT author_id 
            FROM project_info 
            WHERE project_id = %s AND project_status = 0
            """
            cursor.execute(sql, (project_id,))
            result = cursor.fetchone()
            if not result:
                return False
            return result[0] == user_id
    except Exception as e:
        print(f"检查项目权限失败: {e}")
        return False
    finally:
        connection.close()


# ==================== 文档解析相关函数 ====================

def extract_and_parse_images(conv_result, filename, project_id=None):
    """
    从文档中提取图片并使用AI解析
    :param conv_result: docling转换结果
    :param filename: 原始文件名
    :param project_id: 项目ID
    :return: 图片解析结果列表
    """
    from docling_core.types.doc import PictureItem, TableItem
    
    parsed_images = []
    image_counter = 0
    doc_base_name = os.path.splitext(filename)[0]
    
    print(f"\n{'='*60}")
    print(f"📷 开始提取文档中的图片: {filename}")
    print(f"{'='*60}")
    
    try:
        # 处理文档中的图片和表格
        for element, _level in conv_result.document.iterate_items():
            if isinstance(element, (TableItem, PictureItem)):
                image_counter += 1
                element_type = 'table' if isinstance(element, TableItem) else 'picture'
                
                print(f"\n--- 图片 {image_counter} ({element_type}) ---")
                
                try:
                    # 获取图像并转换为字节数据
                    print(f"  ├─ 正在提取图片...")
                    element_image = element.get_image(conv_result.document)
                    width, height = element_image.size
                    print(f"  ├─ 图片尺寸: {width}x{height}px")
                    
                    img_byte_arr = BytesIO()
                    element_image.save(img_byte_arr, format='PNG')
                    img_data = img_byte_arr.getvalue()
                    print(f"  ├─ 图片大小: {len(img_data)/1024:.2f}KB")
                    
                    # 上传到七牛云
                    image_name = f"{doc_base_name}-{element_type}{image_counter}.png"
                    print(f"  ├─ 正在上传到七牛云: {image_name}")
                    upload_result = upload_image_to_qiniu(img_data, image_name, project_id)
                    
                    if upload_result['success']:
                        image_url = upload_result['image_url']
                        print(f"  ├─ ✅ 上传成功: {image_url}")
                        
                        # 验证URL格式
                        if not image_url.startswith('http'):
                            print(f"  ├─ ⚠️  警告: URL格式可能不正确: {image_url}")
                        
                        # 使用AI解析图片内容
                        print(f"  ├─ 🤖 开始AI解析图片内容...")
                        print(f"  ├─ 📎 传递给AI的URL: {image_url}")
                        ai_description = parse_image_with_ai(image_url)
                        
                        if ai_description:
                            print(f"  ├─ ✅ AI解析完成，描述长度: {len(ai_description)}字符")
                            print(f"  ├─ 📝 AI描述预览: {ai_description[:100]}...")
                        else:
                            print(f"  ├─ ⚠️  AI解析返回空内容")
                        
                        # 将图片信息存储到source_list
                        print(f"  ├─ 💾 正在存储到数据库...")
                        source_id = insert_source_to_db(
                            source_content=ai_description,
                            source_type='png',
                            project_id=project_id,
                            source_url=upload_result['image_url'],
                            own_user_id=request.user_id,
                            file_size=len(img_data),
                        session_id=session_id,
                        source_name=image_name
                        )
                        
                        if source_id:
                            parsed_images.append({
                                'source_id': source_id,
                                'source_url': upload_result['image_url'],
                                'source_type': 'png',
                                'image_name': image_name,
                                'source_name': image_name,
                                'ai_description': ai_description[:200] if ai_description else '',  # 只返回前200字符
                                'width': width,
                                'height': height
                            })
                            print(f"  └─ ✅ 完成! source_id: {source_id}")
                        else:
                            print(f"  └─ ❌ 数据库存储失败")
                    else:
                        print(f"  └─ ❌ 上传失败: {upload_result['message']}")
                        
                except Exception as e:
                    print(f"  └─ ❌ 处理失败: {str(e)}")
        
        print(f"\n{'='*60}")
        print(f"✅ 图片提取完成! 共处理 {image_counter} 张图片，成功 {len(parsed_images)} 张")
        print(f"{'='*60}\n")
                    
    except Exception as e:
        print(f"\n❌ 提取图片过程中发生错误: {e}\n")
    
    return parsed_images


# ==================== API 路由 ====================

@app.route('/api/v1/inter/upload_and_parse', methods=['POST'])
@verify_token  # 添加token验证
def upload_and_parse():
    """文档/图片上传并解析服务（需要token认证）"""
    print(f"\n{'='*80}")
    print(f"📤 收到文件上传请求")
    print(f"   用户ID: {request.user_id}")
    print(f"   用户名: {request.username}")
    print(f"{'='*80}\n")
    
    try:
        # 1. 检查是否有文件被上传
        if 'files' not in request.files:
            print("❌ 错误: 请求中没有files字段")
            return jsonify({
                'status': 1,
                'message': '没有找到上传的文件，请使用files字段上传文件',
                'data': 'fail'
            }), 400
        
        # 2. 获取所有文件
        uploaded_files = request.files.getlist('files')
        files = []
        for file in uploaded_files:
            if file.filename != '':
                files.append(file)
        
        # 3. 检查是否有有效文件
        if not files:
            print("❌ 错误: 没有有效的文件")
            return jsonify({
                'status': 1,
                'message': '没有选择有效的文件',
                'data': 'fail'
            }), 400
        
        print(f"📋 收到 {len(files)} 个文件")
        
        # 4. 检查文件数量限制
        if len(files) > MAX_FILES_PER_REQUEST:
            print(f"❌ 错误: 文件数量超过限制 ({len(files)} > {MAX_FILES_PER_REQUEST})")
            return jsonify({
                'status': 1,
                'message': f'单次最多上传{MAX_FILES_PER_REQUEST}个文件，当前选择了{len(files)}个文件',
                'data': 'fail'
            }), 400
        
        # 5. 获取可选参数project_id
        project_id = request.form.get('project_id')
        session_id = request.form.get('session_id')
        if project_id:
            print(f"📁 项目ID: {project_id}")
        else:
            print(f"📁 未提供项目ID")
        if session_id:
            print(f"💬 会话ID: {session_id}")
        else:
            print(f"💬 未提供会话ID")
        
        # 6. 如果提供了project_id，检查项目是否存在
        if project_id and not check_project_exists(project_id):
            print(f"❌ 错误: 项目不存在 (project_id: {project_id})")
            return jsonify({
                'status': 1,
                'message': '项目不存在或已被删除',
                'data': 'fail'
            }), 400
        # 7.1 校验项目权限（仅作者可写）
        if project_id and not check_project_permission(project_id, request.user_id):
            print(f"❌ 错误: 无权限访问项目 (project_id: {project_id}, user_id: {request.user_id})")
            return jsonify({
                'status': 1,
                'message': '无权限访问该项目，仅项目创建者可上传',
                'data': 'fail'
            }), 400
        
        # 7. 验证所有文件
        print(f"\n🔍 开始验证文件...")
        file_info_list = []
        
        for i, file in enumerate(files):
            print(f"\n  📄 文件 {i+1}/{len(files)}: {file.filename}")
            
            # 检查文件名
            if not file.filename:
                print(f"     ❌ 文件名为空")
                return jsonify({
                    'status': 1,
                    'message': '文件名不能为空',
                    'data': 'fail'
                }), 400
            
            # 检查文件类型
            if not allowed_file(file.filename):
                file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else '无扩展名'
                print(f"     ❌ 不支持的文件类型: {file_ext}")
                return jsonify({
                    'status': 1,
                    'message': f'文件 "{file.filename}" 不支持的文件类型，支持的格式: {", ".join(sorted(ALLOWED_EXTENSIONS))}',
                    'data': 'fail'
                }), 400
            
            # 读取文件内容
            file_content = file.read()
            file_size = len(file_content)
            print(f"     📏 文件大小: {file_size/1024:.2f}KB")
            
            # 验证文件大小
            is_valid, error_msg = validate_file_size(file_size)
            if not is_valid:
                print(f"     ❌ {error_msg}")
                return jsonify({
                    'status': 1,
                    'message': f'文件 "{file.filename}" {error_msg}',
                    'data': 'fail'
                }), 400
            
            file_type = get_file_type(file.filename)
            print(f"     📋 文件类型: {file_type}")
            
            # 如果是图片，额外验证图片有效性
            if file_type in IMAGE_EXTENSIONS:
                is_valid_img, error_msg, width, height = validate_image_file(file_content)
                if not is_valid_img:
                    print(f"     ❌ {error_msg}")
                    return jsonify({
                        'status': 1,
                        'message': f'文件 "{file.filename}" {error_msg}',
                        'data': 'fail'
                    }), 400
                print(f"     ✅ 图片有效: {width}x{height}px")
            else:
                print(f"     ✅ 文件验证通过")
            
            # 保存文件信息
            file_info_list.append({
                'file': file,
                'filename': file.filename,
                'content': file_content,
                'size': file_size,
                'file_type': file_type
            })
        
        print(f"\n✅ 所有文件验证通过！")
        
        # 8. 处理所有文件
        print(f"\n{'='*80}")
        print(f"🚀 开始处理文件...")
        print(f"{'='*80}\n")
        
        results = []
        
        for i, file_info in enumerate(file_info_list):
            filename = file_info['filename']
            file_content = file_info['content']
            file_size = file_info['size']
            file_type = file_info['file_type']
            
            print(f"\n{'▶'*40}")
            print(f"📌 处理第 {i+1}/{len(files)} 个文件")
            print(f"   文件名: {filename}")
            print(f"   类型: {file_type}")
            print(f"   大小: {file_size/1024:.2f}KB")
            print(f"{'▶'*40}\n")
            
            try:
                if file_type in DOCUMENT_EXTENSIONS:
                    # ========== 文档处理流程 ==========
                    print(f"开始解析文档: {filename}")
                    
                    # 创建临时文件用于docling解析
                    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                        temp_file.write(file_content)
                        temp_file_path = temp_file.name
                    
                    markdown_content = None
                    parsed_images = []
                    try:
                        # 使用docling转换文档
                        result = safe_convert_document(temp_file_path)
                        
                        # 检查转换是否成功
                        if result and hasattr(result, 'document'):
                            markdown_content = result.document.export_to_markdown()
                            print(f"文档解析完成，内容长度: {len(markdown_content)}")
                            
                            # 提取并解析图片
                            parsed_images = extract_and_parse_images(result, filename, project_id)
                            print(f"提取并解析了 {len(parsed_images)} 张图片")
                        else:
                            print("docling 解析结果为空，准备使用兜底解析")
                    except Exception as e:
                        print(f"docling 解析失败，使用兜底解析: {e}")
                    finally:
                        # 清理临时文件
                        try:
                            os.unlink(temp_file_path)
                        except Exception as cleanup_error:
                            print(f"清理临时文件失败: {cleanup_error}")

                    # 兜底解析：若docling无结果，针对文本/JSON/CSV等直接解码
                    if not markdown_content:
                        markdown_content = fallback_parse_plain(file_content, file_type)
                        print(f"兜底解析完成，内容长度: {len(markdown_content)}")
                    
                    # 将文档解析结果存入数据库（source_url为空）
                    source_id = insert_source_to_db(
                        source_content=markdown_content,
                        source_type=file_type,
                        project_id=project_id,
                        source_url='',
                        own_user_id=request.user_id,
                        file_size=len(file_content),
                        session_id=session_id,
                        source_name=filename
                    )
                    
                    if source_id:
                        results.append({
                            'source_id': source_id,
                            'source_url': '',
                            'source_type': file_type,
                            'filename': filename,
                            'source_name': filename,
                            'content_length': len(markdown_content),
                            'extracted_images': len(parsed_images),
                            'images': parsed_images
                        })
                        print(f"文档解析完成，source_id: {source_id}")
                    else:
                        print(f"文档存入数据库失败")
                        results.append({
                            'error': '文档存入数据库失败',
                            'filename': filename
                        })
                
                elif file_type in IMAGE_EXTENSIONS:
                    # ========== 图片处理流程 ==========
                    print(f"📷 图片处理流程开始")
                    print(f"   ├─ 步骤1: 读取图片信息")
                    
                    # 获取图片尺寸
                    image = Image.open(BytesIO(file_content))
                    width, height = image.size
                    print(f"   ├─ 图片尺寸: {width}x{height}px")
                    print(f"   ├─ 图片格式: {image.format}")
                    
                    # 上传到七牛云
                    print(f"   ├─ 步骤2: 上传到七牛云")
                    upload_result = upload_image_to_qiniu(file_content, filename, project_id)
                    
                    if upload_result['success']:
                        image_url = upload_result['image_url']
                        print(f"   ├─ ✅ 上传成功: {image_url}")
                        
                        # 验证URL格式
                        if not image_url.startswith('http'):
                            print(f"   ├─ ⚠️  警告: URL格式可能不正确: {image_url}")
                        
                        # 使用AI解析图片
                        print(f"   ├─ 步骤3: AI解析图片内容")
                        print(f"   ├─ 🤖 调用视觉大模型中...")
                        print(f"   ├─ 📎 传递给AI的URL: {image_url}")
                        ai_description = parse_image_with_ai(image_url)
                        
                        if ai_description:
                            print(f"   ├─ ✅ AI解析完成，描述长度: {len(ai_description)}字符")
                            print(f"   ├─ 📝 AI描述预览: {ai_description[:100]}...")
                        else:
                            print(f"   ├─ ⚠️  AI解析返回空内容")
                        
                        # 将图片信息存入数据库
                        print(f"   ├─ 步骤4: 存储到数据库")
                        source_id = insert_source_to_db(
                            source_content=ai_description,
                            source_type=file_type,
                            project_id=project_id,
                            source_url=upload_result['image_url'],
                            own_user_id=request.user_id,
                            file_size=len(file_content),
                        session_id=session_id,
                        source_name=filename
                        )
                        
                        if source_id:
                            results.append({
                                'source_id': source_id,
                                'source_url': upload_result['image_url'],
                                'source_type': file_type,
                                'filename': filename,
                                'source_name': filename,
                                'ai_description': ai_description[:200] if ai_description else '',  # 只返回前200字符
                                'width': width,
                                'height': height
                            })
                            print(f"   └─ ✅ 完成! source_id: {source_id}")
                        else:
                            print(f"   └─ ❌ 数据库存储失败")
                            results.append({
                                'error': '图片存入数据库失败',
                                'filename': filename
                            })
                    else:
                        print(f"   └─ ❌ 上传失败: {upload_result['message']}")
                        results.append({
                            'error': f'图片上传失败: {upload_result["message"]}',
                            'filename': filename
                        })
                
                else:
                    results.append({
                        'error': f'不支持的文件类型: {file_type}',
                        'filename': filename
                    })
                    
            except Exception as e:
                print(f"\n❌ 处理文件异常: {filename}")
                print(f"   错误信息: {str(e)}")
                import traceback
                print(f"   堆栈跟踪:\n{traceback.format_exc()}")
                results.append({
                    'error': f'处理失败: {str(e)}',
                    'filename': filename
                })
        
        # 9. 返回处理结果
        print(f"\n{'='*80}")
        print(f"🎉 所有文件处理完成!")
        print(f"   总文件数: {len(results)}")
        print(f"   成功: {sum(1 for r in results if 'source_id' in r)}")
        print(f"   失败: {sum(1 for r in results if 'error' in r)}")
        print(f"{'='*80}\n")
        
        return jsonify({
            'status': 0,
            'message': f'成功处理{len(results)}个文件',
            'data': results
        })
        
    except Exception as e:
        print(f"\n❌❌❌ 服务器严重错误 ❌❌❌")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪:\n{traceback.format_exc()}")
        
        return jsonify({
            'status': 1,
            'message': 'python服务器内部错误',
            'data': 'fail'
        }), 500


@app.route('/api/v1/test/db_connection', methods=['GET'])
def test_db_connection():
    """测试数据库连接"""
    connection = get_db_connection()
    if connection:
        connection.close()
        return jsonify({
            'status': 0,
            'message': '数据库连接成功',
            'data': None
        })
    else:
        return jsonify({
            'status': 1,
            'message': '数据库连接失败',
            'data': 'fail'
        }), 500


@app.route('/api/v1/test/qiniu_connection', methods=['GET'])
def test_qiniu_connection_route():
    """测试七牛云连接和配置"""
    success, message, data = test_qiniu_connection()
    
    if success:
        return jsonify({
            'status': 0,
            'message': message,
            'data': data
        })
    else:
        return jsonify({
            'status': 1,
            'message': message,
            'data': 'fail'
        }), 500


# ==================== 未绑定资源查询 ====================

@app.route('/api/v1/inter/unbound_sources', methods=['GET'])
@verify_token
def list_unbound_sources():
    """
    查询当前用户未绑定 dialogue 的资源列表
    可选参数:
      - limit (默认50，最大200)
      - session_id（优先使用，过滤当前会话下未绑定dialogue的附件）
      - project_id（可选，用于已知项目但未绑定dialogue的附件）
    规则：
      1) 若提供 session_id，则按 session_id + own_user_id + dialogue_id IS NULL + source_status=0
      2) 否则若提供 project_id，则按 project_id + own_user_id + dialogue_id IS NULL + source_status=0
      3) 否则默认按 own_user_id + project_id IS NULL + dialogue_id IS NULL + source_status=0
    """
    try:
        limit = request.args.get('limit', default=50, type=int)
        limit = max(1, min(limit, 200))
        session_id = request.args.get('session_id')
        project_id = request.args.get('project_id')
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'status': 1,
                'message': '数据库连接失败',
                'data': 'fail'
            }), 500
        
        try:
            with connection.cursor() as cursor:
                params = [request.user_id]
                where_clauses = ["source_status = 0", "own_user_id = %s", "dialogue_id IS NULL"]
                
                if session_id:
                    where_clauses.append("session_id = %s")
                    params.append(session_id)
                elif project_id:
                    where_clauses.append("project_id = %s")
                    params.append(project_id)
                else:
                    where_clauses.append("project_id IS NULL")
                
                where_sql = " AND ".join(where_clauses)
                sql = f"""
                SELECT source_id, source_url, source_type, project_id, source_status, create_time, file_size, dialogue_id, session_id, source_name
                FROM source_list
                WHERE {where_sql}
                ORDER BY create_time DESC
                LIMIT %s
                """
                params.append(limit)
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                
                data = []
                for row in rows:
                    data.append({
                        'source_id': row[0],
                        'source_url': row[1],
                        'source_type': row[2],
                        'project_id': row[3],
                        'source_status': row[4],
                        'create_time': row[5].strftime('%Y-%m-%d %H:%M:%S') if row[5] else None,
                        'file_size': row[6],
                        'dialogue_id': row[7],
                        'session_id': row[8],
                        'source_name': row[9],
                    })
                
                return jsonify({
                    'status': 0,
                    'message': 'success',
                    'data': data
                })
        finally:
            connection.close()
    except Exception as e:
        print(f"❌ 查询未绑定资源失败: {e}")
        return jsonify({
            'status': 1,
            'message': '查询未绑定资源失败',
            'data': 'fail'
        }), 500


@app.route('/api/v1/inter/bind_sources', methods=['POST'])
@verify_token
def bind_sources():
    """
    批量绑定资源到 project/session/dialogue
    请求体(JSON):
      {
        "source_ids": ["id1", "id2", ...],  // 必填，<=200
        "project_id": "...",                // 可选
        "session_id": "...",                // 可选
        "dialogue_id": "..."                // 可选
      }
    仅允许绑定当前用户 own 的资源，且 source_status=0
    """
    try:
        payload = request.get_json(silent=True) or {}
        source_ids = payload.get('source_ids') or []
        project_id = payload.get('project_id')
        session_id = payload.get('session_id')
        dialogue_id = payload.get('dialogue_id')
        
        if not isinstance(source_ids, list) or len(source_ids) == 0:
            return jsonify({
                'status': 1,
                'message': 'source_ids 必须是非空数组',
                'data': 'fail'
            }), 400
        if len(source_ids) > 200:
            return jsonify({
                'status': 1,
                'message': '一次最多绑定200个资源',
                'data': 'fail'
            }), 400
        
        fields_to_update = []
        params = []
        if project_id is not None:
            fields_to_update.append("project_id = %s")
            params.append(project_id)
        if session_id is not None:
            fields_to_update.append("session_id = %s")
            params.append(session_id)
        if dialogue_id is not None:
            fields_to_update.append("dialogue_id = %s")
            params.append(dialogue_id)
        
        if not fields_to_update:
            return jsonify({
                'status': 1,
                'message': '至少提供一个需要绑定的字段（project_id/session_id/dialogue_id）',
                'data': 'fail'
            }), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'status': 1,
                'message': '数据库连接失败',
                'data': 'fail'
            }), 500
        
        try:
            with connection.cursor() as cursor:
                placeholders = ", ".join(["%s"] * len(source_ids))
                sql = f"""
                UPDATE source_list
                SET {", ".join(fields_to_update)}
                WHERE source_id IN ({placeholders})
                  AND own_user_id = %s
                  AND source_status = 0
                """
                params_full = params + source_ids + [request.user_id]
                affected = cursor.execute(sql, params_full)
                connection.commit()
                
                return jsonify({
                    'status': 0,
                    'message': '绑定成功',
                    'data': {
                        'affected': affected
                    }
                })
        except Exception as e:
            connection.rollback()
            print(f"❌ 绑定资源失败: {e}")
            return jsonify({
                'status': 1,
                'message': '绑定资源失败',
                'data': 'fail'
            }), 500
        finally:
            connection.close()
    except Exception as e:
        print(f"❌ 绑定资源接口异常: {e}")
        return jsonify({
            'status': 1,
            'message': '绑定资源接口异常',
            'data': 'fail'
        }), 500


@app.route('/api/v1/inter/cancel_source', methods=['POST'])
@verify_token
def cancel_source():
    """
    取消/删除已上传的资源：将 source_status 置为 1
    """
    try:
        payload = request.get_json(silent=True) or {}
        source_id = payload.get('source_id')
        if not source_id:
            return jsonify({
                'status': 1,
                'message': 'source_id 必填',
                'data': 'fail'
            }), 400

        connection = get_db_connection()
        if not connection:
            return jsonify({
                'status': 1,
                'message': '数据库连接失败',
                'data': 'fail'
            }), 500

        try:
            with connection.cursor() as cursor:
                sql = """
                UPDATE source_list
                SET source_status = 1
                WHERE source_id = %s AND own_user_id = %s
                """
                affected = cursor.execute(sql, (source_id, request.user_id))
                connection.commit()
                return jsonify({
                    'status': 0,
                    'message': '资源已取消' if affected > 0 else '资源不存在或无权限',
                    'data': {'affected': affected}
                })
        except Exception as e:
            connection.rollback()
            print(f"取消资源失败: {e}")
            return jsonify({
                'status': 1,
                'message': '取消资源失败',
                'data': 'fail'
            }), 500
        finally:
            connection.close()
    except Exception as e:
        print(f"❌ cancel_source 异常: {e}")
        return jsonify({
            'status': 1,
            'message': '取消资源异常',
            'data': 'fail'
        }), 500


# ==================== 主函数 ====================

if __name__ == '__main__':
    print("\n" + "=" * 80)
    print("  🚀 AutoProvider 文档解析服务启动中...")
    print("=" * 80)
    
    print("\n📋 基本配置:")
    print(f"  • 支持的文件格式: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
    print(f"  • 最大文件大小: {MAX_CONTENT_LENGTH/1024/1024:.1f}MB")
    print(f"  • 最小文件大小: {MIN_FILE_SIZE} bytes")
    print(f"  • 单次最多上传: {MAX_FILES_PER_REQUEST} 个文件")
    
    print("\n🔐 安全配置:")
    print(f"  • Token验证: ✅ 已启用")
    print(f"  • JWT算法: {JWT_ALGORITHM}")
    print(f"  • 需要在请求头添加: Authorization: Bearer <token>")
    
    print("\n📡 上传接口:")
    print(f"  • 地址: /api/v1/inter/upload_and_parse")
    print(f"  • 方法: POST")
    print(f"  • 参数: files(必需), project_id(可选)")
    print(f"  • 认证: 需要Token")
    print(f"  • 支持: 批量上传，返回数组格式")
    
    print("\n🔄 解析流程:")
    print("  文档流程:")
    print("    用户上传 → Token验证 → 文件验证 → Docling解析")
    print("    → 提取图片 → 上传七牛云 → AI解析图片 → 存储到MySQL")
    print("  图片流程:")
    print("    用户上传 → Token验证 → 文件验证 → 上传七牛云")
    print("    → AI解析 → 存储到MySQL")
    
    print("\n☁️  七牛云对象存储:")
    print(f"  • 存储空间: {QINIU_BUCKET_NAME}")
    print(f"  • 访问域名: {QINIU_DOMAIN}")
    print(f"  • 目录结构: project/static/image/")
    print(f"  • 访问方式: 公开访问（无需签名）")
    
    print("\n💾 数据库配置:")
    print(f"  • 数据库: {DB_CONFIG['database']}")
    print(f"  • 主机: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    print(f"  • 用户: {DB_CONFIG['user']}")
    print(f"  • 存储表: source_list")
    
    print("\n🤖 AI视觉解析:")
    print(f"  • API: Silicon Flow")
    print(f"  • 模型: Qwen/Qwen2-VL-32B-Instruct")
    print(f"  • 功能: 自动识别图片内容、提取文字和代码")
    print(f"  • 温度: 0.2 (更精确)")
    print(f"  • 最大Token: 8000")
    
    print("\n🔍 验证功能:")
    print("  ✓ 文件类型验证")
    print("  ✓ 文件大小验证")
    print("  ✓ 图片有效性验证")
    print("  ✓ 项目存在性验证")
    print("  ✓ Token身份验证")
    
    print("\n🧪 测试接口:")
    print("  • GET  /api/v1/test/db_connection     - 测试数据库连接")
    print("  • GET  /api/v1/test/qiniu_connection  - 测试七牛云连接")
    
    print("\n" + "=" * 80)
    print("  ✅ 服务启动完成！监听端口: http://0.0.0.0:5000")
    print("=" * 80 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000, load_dotenv=False)
