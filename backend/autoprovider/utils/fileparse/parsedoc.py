# 文档解析相关功能模块
import os
import warnings
import numpy as np
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import PdfFormatOption

# 过滤numpy警告和其他无关紧要的警告
warnings.filterwarnings('ignore', category=RuntimeWarning, module='numpy')
warnings.filterwarnings('ignore', category=UserWarning, module='transformers')
warnings.filterwarnings('ignore', category=FutureWarning)
np.seterr(divide='ignore', invalid='ignore')

# 图像解析配置
IMAGE_RESOLUTION_SCALE = 2.0

# 配置支持图像处理的文档解析服务
pipeline_options = PdfPipelineOptions()
pipeline_options.images_scale = IMAGE_RESOLUTION_SCALE
pipeline_options.generate_page_images = True
pipeline_options.generate_picture_images = True

converter = DocumentConverter(
    format_options={
        InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options),
        InputFormat.IMAGE: PdfFormatOption(pipeline_options=pipeline_options)
    }
)


def safe_convert_document(file_path):
    """
    安全地转换文档，临时禁用警告，并支持图像处理
    :param file_path: 文档文件路径
    :return: 转换结果
    """
    try:
        # 临时保存当前的警告设置
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            # 执行文档转换
            result = converter.convert(file_path)
            return result
    except Exception as e:
        raise e


def count_image_placeholders(markdown_content):
    """
    统计markdown内容中的图片占位符数量
    :param markdown_content: markdown内容
    :return: 占位符数量
    """
    return markdown_content.count("<!-- image -->")
