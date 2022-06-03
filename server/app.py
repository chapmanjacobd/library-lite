import json

import yt_dlp
from cachetools import func
from zstandard import ZstdCompressor

from utils import THREE_DAYS

ydl_opts = {
    "skip_download": True,
    "check_formats": False,
    "no_check_certificate": True,
    "no_warnings": True,
    "ignore_no_formats_error": True,
    "ignoreerrors": True,
    "skip_playlist_after_errors": 10,
    "quiet": True,
    "dynamic_mpd": False,
    "youtube_include_dash_manifest": False,
    "youtube_include_hls_manifest": False,
    "extract_flat": True,
    "clean_infojson": False,
    # "writesubtitles": True,
    # "writeautomaticsub": True,
    # "subtitleslangs": "en.*,EN.*",
    # "playliststart": 2000, # an optimization needs to be made in yt-dlp to support some form of background backfilling/pagination. 2000-4000 takes 40 seconds instead of 20.
    "playlistend": 2000,
    "rejecttitle": "|".join(
        [
            "Trailer",
            "Sneak Peek",
            "Preview",
            "Teaser",
            "Promo",
            "Crypto",
            "Montage",
            "Bitcoin",
            "Apology",
            " Clip",
            "Clip ",
            "Best of",
            "Compilation",
            "Top 10",
            "Top 9",
            "Top 8",
            "Top 7",
            "Top 6",
            "Top 5",
            "Top 4",
            "Top 3",
            "Top 2",
            "Top Ten",
            "Top Nine",
            "Top Eight",
            "Top Seven",
            "Top Six",
            "Top Five",
            "Top Four",
            "Top Three",
            "Top Two",
        ]
    ),
}
yt_dlp.utils.std_headers["User-Agent"] = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"


def supported(url):  # thank you @dbr
    ies = yt_dlp.extractor.gen_extractors()
    for ie in ies:
        if ie.suitable(url) and ie.IE_NAME != "generic":
            return True  # Site has dedicated extractor
    return False


@func.ttl_cache(maxsize=50_000, ttl=THREE_DAYS)
def fetch_playlist(playlist):
    if not supported(playlist):
        return None

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        playlist_dict = ydl.extract_info(playlist, download=False)

        if not playlist_dict:
            return None

        playlist_dict.pop("availability", None)
        playlist_dict.pop("formats", None)
        playlist_dict.pop("requested_formats", None)
        playlist_dict.pop("thumbnails", None)

        playlist_dict["playlist_count"] = playlist_dict.get("playlist_count") or len(playlist_dict)

        if playlist_dict.get("entries"):
            for v in playlist_dict["entries"]:
                v.pop("thumbnails", None)
                v.pop("_type", None)
                v.pop("availability", None)
                v.pop("channel_id", None)
                v.pop("description", None)
                v.pop("live_status", None)
                v.pop("release_timestamp", None)
                v.pop("view_count", None)
                v.pop("upload_date", None)

                v["channel"] = v.get("channel") or playlist_dict.get("channel")
                v["original_url"] = playlist_dict.get("original_url")
                v["playlist_count"] = v.get("playlist_count") or playlist_dict.get("playlist_count")
                v["playlist_title"] = playlist_dict.get("title")
                v["title"] = v.get("title") or playlist_dict.get("title")
                v["uploader"] = v.get("uploader") or playlist_dict.get("uploader")

        if playlist_dict.get("entries") is None:
            video_dict = dict(
                channel=playlist_dict.get("channel"),
                id=playlist_dict.get("id"),
                ie_key=playlist_dict.get("extractor_key"),
                original_url=playlist_dict.get("original_url"),
                playlist_count=1,
                title=playlist_dict.get("title"),
                uploader=playlist_dict.get("uploader"),
            )
            playlist_dict = {**video_dict, "entries": [video_dict]}

        cctx = ZstdCompressor(8)
        compressed = cctx.compress(
            json.dumps(
                playlist_dict,
                ensure_ascii=False,
                allow_nan=False,
                indent=None,
                separators=(",", ":"),
            ).encode("utf-8")
        )
        return compressed


if __name__ == "__main__":
    import argparse
    from timeit import default_timer as timer

    from rich import print

    parser = argparse.ArgumentParser()
    parser.add_argument("playlists", nargs="+", default=[])
    args = parser.parse_args()
    print(args)

    for playlist in args.playlists:
        start = timer()
        print(type(fetch_playlist(playlist)))
        end = timer()
        print(end - start)
