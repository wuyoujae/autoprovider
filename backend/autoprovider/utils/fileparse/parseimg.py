# 图片AI解析相关功能模块
import asyncio
from openai import OpenAI

# 视觉大模型配置
BASE_URL = "https://api.siliconflow.cn/v1/"
API_KEY = "sk-lblwpifyuxgkltdtjfvxyjsnnkcrmwpnqqqjarcdahgozaha"
MODEL = "Qwen/Qwen3-VL-32B-Instruct"

# 初始化OpenAI客户端
client = OpenAI(
    base_url=BASE_URL,
    api_key=API_KEY
)


def parse_image_with_ai(image_url):
    """
    使用AI视觉模型解析图片内容
    :param image_url: 图片的URL地址（需要是完整的http/https URL）
    :return: AI解析的文字描述
    """
    # 打印调试信息
    print(f"\n{'='*60}")
    print(f"🔍 准备调用AI解析图片")
    print(f"   📎 图片URL: {image_url}")
    print(f"   🤖 使用模型: {MODEL}")
    print(f"   🌐 API地址: {BASE_URL}")
    
    # 验证URL格式
    if not image_url:
        print(f"   ❌ 错误: 图片URL为空")
        print(f"{'='*60}\n")
        return ""
    
    if not image_url.startswith(('http://', 'https://')):
        print(f"   ❌ 错误: URL格式不正确，必须以http://或https://开头")
        print(f"   当前URL: {image_url}")
        print(f"{'='*60}\n")
        return ""
    
    print(f"   ✅ URL格式验证通过")
    print(f"{'='*60}\n")
    
    params = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    },
                    {
                        "type": "text",
                        "text": "请识别这张图片，你需要按照下面这个方法来进行描述这个图片：1，这个照片的大概内容，有什么作用？。2，如果图片中出现了代码或者文字，你需要把他们全部描述出来。"
                    }
                ]
            }
        ],
        "temperature": 0.2,
        "max_tokens": 8000,
        "stream": True
    }
    
    try:
        response = client.chat.completions.create(
            model=params["model"],
            messages=params["messages"],
            temperature=params["temperature"],
            max_tokens=params["max_tokens"],
            stream=params["stream"]
        )
        
        full_content = ""
        
        for chunk in response:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_content += content
                # 可以打印进度
                print(content, end='', flush=True)
            
            # 检查是否有usage信息
            if hasattr(chunk, 'usage') and chunk.usage:
                print(f"\n请求花销usage: {chunk.usage}")
        
        print(f"\n{'='*60}")
        print(f"✅ 图片AI解析完成")
        print(f"   📝 解析内容长度: {len(full_content)} 字符")
        print(f"{'='*60}\n")
        return full_content
        
    except Exception as e:
        print(f"\n{'='*60}")
        print(f"❌ 图片AI解析失败")
        print(f"   错误类型: {type(e).__name__}")
        print(f"   错误详情: {e}")
        print(f"   图片URL: {image_url}")
        print(f"{'='*60}\n")
        return ""


def batch_parse_images(image_urls):

    results = []
    for i, image_url in enumerate(image_urls):
        print(f"正在解析第 {i+1}/{len(image_urls)} 张图片...")
        result = parse_image_with_ai(image_url)
        results.append(result)
    return results
