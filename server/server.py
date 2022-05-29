from urllib.parse import quote_plus, urlparse

from slowapi.errors import RateLimitExceeded
from slowapi.extension import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from zstandard import ZstdDecompressor

from app import fetch_playlist
from utils import AlreadyJsonResponse, format_url

limiter = Limiter(key_func=get_remote_address)
app = Starlette(debug=False)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@limiter.limit("20/minute")
def route_fetch_playlist(request: Request):
    query_params = request.query_params
    playlist = query_params.get("playlist")

    if not playlist:
        return PlainTextResponse("Empty input", status_code=422)
    if len(playlist) > 300:
        return PlainTextResponse("URL is too looooooong", status_code=414)
    if len(playlist) < 5:
        return PlainTextResponse("URL is tooooooo short", status_code=422)

    playlist = format_url(playlist).splitlines()[0].strip()
    try:
        r = urlparse(playlist)
    except:
        return PlainTextResponse("URL is malformed...//", status_code=422)
    else:
        if r.netloc == "" or r.path == "":
            return PlainTextResponse("URL has no netloc", status_code=422)

    playlist = quote_plus(playlist, safe=":/?=")
    data = fetch_playlist(playlist)
    if not data:
        return PlainTextResponse("Playlist lackof valid", status_code=422)

    dctx = ZstdDecompressor()
    decompressed = dctx.decompress(data)
    return AlreadyJsonResponse(decompressed)


app.add_route("/v1", route_fetch_playlist)
