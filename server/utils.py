import re

from starlette.responses import JSONResponse

THREE_DAYS = 60 * 60 * 24 * 3
FIVE_HOURS = 60 * 60 * 5
REGEXP_HTTP = re.compile(r"(?:http|https)://")


def format_url(url):
    if not REGEXP_HTTP.match(url):
        return "https://{}".format(url)
    return url


class AlreadyJsonResponse(JSONResponse):
    def render(self, content) -> bytes:
        return content
