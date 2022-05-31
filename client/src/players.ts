

import LiteYTEmbed from 'lite-youtube-embed';
import 'lite-youtube-embed/src/lite-yt-embed.css';

// window.LiteYTEmbed = LiteYTEmbed

function parseYTid(url: string) {
    let urla = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return undefined !== urla[2] ? urla[2].split(/[^0-9a-z_\-]/i)[0] : urla[0];
}
export function loadYT(url: string, start: number = 0, end: number = 0) {
    let videoid = parseYTid(url)
    return `<iframe id='ytplayer' type='text/html' width='100%' height='100%' src='https://www.youtube.com/embed/${videoid}?version=3&loop=1&playlist=${videoid}&autoplay=1&rel=0&start=${start}&end=${end > 0 ? '&end=' + end : ''}&hl=en&cc_load_policy=1&cc_lang_pref=en&cc=1&hd=1&iv_load_policy=3&origin=https://www.unli.xyz' frameborder='0'
  allowfullscreen="allowfullscreen" mozallowfullscreen="mozallowfullscreen" msallowfullscreen="msallowfullscreen" oallowfullscreen="oallowfullscreen" allowscriptaccess="always" webkitallowfullscreen="webkitallowfullscreen"></iframe>`;
}
function loadYTlazy(url: string, playlabel: string, start: number = 0, end: number = 0) {
    let videoid = parseYTid(url)
    return `<lite-youtube id='ytplayer' width='100%' height='100%' videoid='${videoid}' playlabel='${playlabel}' params='version=3&playlist=${videoid}&rel=0&start=${start}${end > 0 ? '&end=' + end : ''}&hl=en&cc_load_policy=1&cc_lang_pref=en&cc=1&hd=1&iv_load_policy=3&origin=https://www.unli.xyz'></lite-youtube>`
}
function ytValidId(url: string) {
    if (!url) return false;
    return url != "" && !parseYTid(url).includes("search");
}

export function vimeo(id: string) {
    return `<iframe src="https://player.vimeo.com/video/${id}?&autoplay=1&color=ffffff&title=0&byline=0&portrait=0"
                style="width:100%;height:100%;" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen>
            </iframe>  <script src="https://player.vimeo.com/api/player.js"></script>`
}
