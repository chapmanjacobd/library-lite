
export interface Entree {
    _type: "url",
    ie_key: string, // Youtube
    id: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    description: null,
    duration: 213,
    view_count: null,
    uploader: "Rick Astley",
    channel_id: "UCuAXFkgsw1L7xaCfnd5JJOw",
    thumbnails: [
        {
            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg?sqp=-oaymwEjCNACELwBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLDOZ1h20ByRP_-2KuQ-l58BHOqkFA",
            height: 188,
            width: 336
        }
    ],
    upload_date: null,
    live_status: null,
    release_timestamp: null,
    availability: null,
    original_url: string // "https://www.youtube.com/playlist?list=PL8A83124F1D79BD4F"
}

export interface Playlist {
    original_url: string
    duration: number
    entries?: Entree[],
    uploader: "Mejoo and Cats",
    uploader_id: "UCCb6W2FU1L7j9mw14YK-9yg",
    uploader_url: "https://www.youtube.com/c/MejooandCats",
    thumbnails: [
        {
            url: "https://i.ytimg.com/vi/P6uDE4JmnZs/hqdefault.jpg?sqp=-oaymwEXCNACELwBSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLBux1pZXNPGRQNMAlJrwFgYayrwMg",
            height: 188,
            width: 336,
            id: "3",
            resolution: "336x188"
        }
    ],
    tags: [],
    view_count: 2768,
    availability: null,
    modified_date: "20220421",
    playlist_count: 17,
    channel_follower_count: null,
    channel: "Mejoo and Cats",
    channel_id: "UCCb6W2FU1L7j9mw14YK-9yg",
    channel_url: "https://www.youtube.com/c/MejooandCats",
    id: "PL9tbKqNeOjUy1J7otU7fex06EFN9TH3F5",
    title: "짧은 동영상 Shorts",
    description: "",
    _type: "playlist",
    webpage_url: "https://www.youtube.com/playlist?list=PL9tbKqNeOjUy1J7otU7fex06EFN9TH3F5",
    original_url: "https://www.youtube.com/playlist?list=PL9tbKqNeOjUy1J7otU7fex06EFN9TH3F5",
    webpage_url_basename: "playlist",
    webpage_url_domain: "youtube.com",
    extractor: "youtube:tab",
    extractor_key: "YoutubeTab",
    requested_entries: null
}
