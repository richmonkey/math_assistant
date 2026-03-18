import logging
import logging.handlers
import sys
from logging import Logger
from pathlib import Path
from typing import Optional

MAX_LOG_MESSAGE_LENGTH = 1024


# 配置日志过滤器，截断超长日志
class TruncateLogFilter(logging.Filter):
    """截断超长日志消息"""

    def __init__(self, max_length=MAX_LOG_MESSAGE_LENGTH):
        super().__init__()
        self.max_length = max_length

    def filter(self, record):
        # 先获取格式化后的消息
        try:
            msg = record.getMessage()
        except Exception:
            msg = str(record.msg)

        if len(msg) > self.max_length:
            # 截断消息并更新 record
            truncated = (
                msg[: self.max_length] + f"... (truncated, total {len(msg)} chars)"
            )
            record.msg = truncated
            record.args = ()  # 清空 args，避免重复格式化
        return True


def init_logger(log_filename: Optional[str] = None, level: int = logging.DEBUG):
    # 为 dashscope 的 HTTP 请求日志添加过滤器
    # dashscope_logger.addFilter(TruncateLogFilter(max_length=300))
    # logging.getLogger("peewee").addFilter(TruncateLogFilter(max_length=300))

    logger = logging.getLogger("")
    root = logger
    root.setLevel(level)
    root.handlers.clear()
    if log_filename:
        # 错误日志文件 handler - 不添加 filter，显示完整日志
        log_path = Path(log_filename)
        log_filename_with_suffix = log_path.stem + "_err" + log_path.suffix
        err_logfilepath = log_path.parent / log_filename_with_suffix
        handler = logging.handlers.RotatingFileHandler(
            err_logfilepath, maxBytes=1024 * 1024 * 1024, backupCount=2
        )
        handler.setLevel(logging.WARNING)
        # 不添加 filter，保留完整错误日志
        formatter = logging.Formatter(
            "%(asctime)s %(name)s %(filename)s:%(lineno)d -  %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        root.addHandler(handler)

        # 普通日志文件 handler - 添加截断 filter
        handler = logging.handlers.RotatingFileHandler(
            log_filename, maxBytes=1024 * 1024 * 1024, backupCount=2
        )
        handler.setLevel(level)
        handler.addFilter(
            TruncateLogFilter(max_length=MAX_LOG_MESSAGE_LENGTH)
        )  # 只对这个 handler 截断
        formatter = logging.Formatter(
            "%(asctime)s %(name)s %(filename)s:%(lineno)d -  %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        root.addHandler(handler)
    else:
        # stderr handler - 不添加 filter，显示完整错误日志
        ch = logging.StreamHandler(sys.stderr)
        ch.setLevel(logging.WARNING)
        # 不添加 filter，保留完整错误日志
        formatter = logging.Formatter(
            "%(asctime)s %(name)s %(filename)s:%(lineno)d -  %(levelname)s - %(message)s"
        )
        ch.setFormatter(formatter)
        root.addHandler(ch)

        # stdout handler - 添加截断 filter
        ch = logging.StreamHandler(sys.stdout)
        ch.setLevel(level)
        ch.addFilter(
            TruncateLogFilter(max_length=MAX_LOG_MESSAGE_LENGTH)
        )  # 只对这个 handler 截断
        formatter = logging.Formatter(
            "%(asctime)s %(name)s %(filename)s:%(lineno)d -  %(levelname)s - %(message)s"
        )
        ch.setFormatter(formatter)

        root.addHandler(ch)

        print("filters:", root.filters)
