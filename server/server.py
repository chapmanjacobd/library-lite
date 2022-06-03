import subprocess
from urllib.parse import quote_plus, urlparse

from fastapi_utils.tasks import repeat_every
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from zstandard import ZstdDecompressor

from app import fetch_playlist
from utils import FIVE_HOURS, AlreadyJsonResponse, format_url

app = Starlette(debug=False)


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


@app.on_event("startup")
@repeat_every(seconds=FIVE_HOURS, wait_first=True)
def periodic_update():
    try:
        output = subprocess.check_output(["pipenv", "update"])
        print(output.decode("ascii"))
    except subprocess.CalledProcessError as e:
        print(e.output)
