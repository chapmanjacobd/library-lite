import re

from starlette.responses import JSONResponse
from zstandard import ZstdCompressor

THREE_DAYS = 60 * 60 * 24 * 3
cctx = ZstdCompressor(8)
REGEXP_HTTP = re.compile(r"(?:http|https)://")


def safe_del(dict, key):
    if dict.get(key):
        del dict[key]


def format_url(url):
    if not REGEXP_HTTP.match(url):
        return "https://{}".format(url)
    return url


class AlreadyJsonResponse(JSONResponse):
    def render(self, content) -> bytes:
        return content
