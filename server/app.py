import json

import yt_dlp
from cachetools import func

from utils import THREE_DAYS, cctx, safe_del

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
    # "playlistend": 10_000,
    "rejecttitle": " | ".join(
        [
            "Trailer",
            "Sneak Peek",
            "Preview",
            "Teaser",
            "Promo",
            "Live Stream",
            "Twitch",
            "Crypto",
            "Meetup",
            "Montage",
            "Bitcoin",
            "Apology",
            "Clip",
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

        if playlist_dict.get("entries") is None:
            safe_del(playlist_dict, "formats")
            safe_del(playlist_dict, "requested_formats")
            playlist_dict = dict(
                entries=[playlist_dict],
                playlist_count=1,
                availability=playlist_dict.get("availability"),
                channel=playlist_dict.get("channel"),
                channel_follower_count=playlist_dict.get("channel_follower_count"),
                channel_id=playlist_dict.get("channel_id"),
                channel_url=playlist_dict.get("channel_url"),
                description=playlist_dict.get("description"),
                extractor=playlist_dict.get("extractor"),
                extractor_key=playlist_dict.get("extractor_key"),
                id=playlist_dict.get("id"),
                original_url=playlist_dict.get("original_url"),
                tags=playlist_dict.get("tags"),
                thumbnails=playlist_dict.get("thumbnails"),
                title=playlist_dict.get("title"),
                uploader=playlist_dict.get("uploader"),
                uploader_id=playlist_dict.get("uploader_id"),
                uploader_url=playlist_dict.get("uploader_url"),
                view_count=playlist_dict.get("view_count"),
                webpage_url=playlist_dict.get("webpage_url"),
                webpage_url_basename=playlist_dict.get("webpage_url_basename"),
                webpage_url_domain=playlist_dict.get("webpage_url_domain"),
            )

        # print(playlist_dict)
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
