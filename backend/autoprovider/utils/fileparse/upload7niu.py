# 七牛云上传相关功能模块
import os
import uuid
from qiniu import Auth, put_data, BucketManager
from datetime import datetime

# 七牛云配置
QINIU_ACCESS_KEY = 'e8RSIMKTr4cNS1_Pvvv7jVmi4hcZOjhrMUQwYIiz'
QINIU_SECRET_KEY = '8w6z507b_xzp64XDljhJD3Uk-ZZVxps5T2HojBvc'
QINIU_BUCKET_NAME = 'autoprovider'
QINIU_DOMAIN = 't4vr0t8sh.hn-bkt.clouddn.com'
QINIU_EXPIRE_SECONDS = 86400  # 签名URL的过期时间（86400秒）

# 目录结构配置
QINIU_PROJECT_FOLDER = 'project/'  # 项目根目录
QINIU_STATIC_FOLDER = 'static/'  # 静态资源目录
QINIU_IMAGE_FOLDER = 'image/'  # 图片目录

# 初始化七牛云认证
qiniu_auth = Auth(QINIU_ACCESS_KEY, QINIU_SECRET_KEY)


def upload_image_to_qiniu(image_data, original_filename, project_id=None):
    """
    上传图片到七牛云对象存储
    :param image_data: 图片的二进制数据
    :param original_filename: 原始文件名
    :param project_id: 项目ID（可选）
    :return: 上传结果字典
    """
    try:
        # 生成唯一的文件名，保留原始扩展名
        file_extension = os.path.splitext(original_filename)[1] or '.png'
        unique_filename = f"{uuid.uuid4().hex}{file_extension}"
        
        # 构建存储在七牛云的完整路径：project/static/image/unique_filename
        qiniu_key = f"{QINIU_PROJECT_FOLDER}{QINIU_STATIC_FOLDER}{QINIU_IMAGE_FOLDER}{unique_filename}"
        
        print(f"\n{'='*60}")
        print(f"📤 七牛云上传准备")
        print(f"   原始文件名: {original_filename}")
        print(f"   生成文件名: {unique_filename}")
        print(f"   存储路径: {qiniu_key}")
        print(f"   空间名称: {QINIU_BUCKET_NAME}")
        print(f"   访问域名: {QINIU_DOMAIN}")
        
        # 生成上传凭证，设置1小时过期
        token = qiniu_auth.upload_token(QINIU_BUCKET_NAME, qiniu_key, 3600)
        
        # 上传图片数据
        print(f"   正在上传...")
        ret, info = put_data(token, qiniu_key, image_data)
        
        if info.status_code == 200:
            # 上传成功，构建访问URL（公开访问）
            image_url = f"https://{QINIU_DOMAIN}/{qiniu_key}"
            print(f"   ✅ 上传成功")
            print(f"   完整URL: {image_url}")
            print(f"{'='*60}\n")
            
            return {
                'success': True,
                'qiniu_key': qiniu_key,
                'image_url': image_url,
                'filename': unique_filename,
                'original_filename': original_filename,
                'hash': ret.get('hash', ''),
                'size': len(image_data),
                'message': '图片上传七牛云成功'
            }
        else:
            print(f"   ❌ 上传失败")
            print(f"   状态码: {info.status_code}")
            print(f"   错误信息: {info.error}")
            print(f"{'='*60}\n")
            return {
                'success': False,
                'error_code': info.status_code,
                'error_message': info.error,
                'message': f'图片上传七牛云失败: {info.error}'
            }
            
    except Exception as e:
        print(f"\n{'='*60}")
        print(f"❌ 七牛云上传异常")
        print(f"   错误类型: {type(e).__name__}")
        print(f"   错误详情: {str(e)}")
        print(f"{'='*60}\n")
        return {
            'success': False,
            'error_message': str(e),
            'message': f'图片上传过程中发生异常: {str(e)}'
        }


def test_qiniu_connection():
    """
    测试七牛云连接和配置
    :return: (success, message, data) 元组
    """
    try:
        # 创建BucketManager来测试连接
        bucket_manager = BucketManager(qiniu_auth)
        
        # 尝试获取空间信息来验证连接
        ret, eof, info = bucket_manager.list(QINIU_BUCKET_NAME, limit=1)
        
        if info.status_code == 200:
            return True, '七牛云连接成功', {
                'bucket': QINIU_BUCKET_NAME,
                'domain': QINIU_DOMAIN,
                'project_folder': QINIU_PROJECT_FOLDER,
                'connection_test': '成功'
            }
        else:
            return False, f'七牛云连接失败: {info.error}', {
                'error_code': info.status_code,
                'error_detail': info.error
            }
            
    except Exception as e:
        return False, f'七牛云配置错误: {str(e)}', {
            'error_detail': str(e)
        }
