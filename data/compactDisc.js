
class AudioCompactDisc {
    constructor() {
        this.discid_cdindex=null;
        this.discid_cddb=null;
        this.cd_text_flag=false;
        this.cd_extra_flag=false;
        this.album=null;
        this.artist=null;
        this.genre=null;
        this.track_count=null;
        this.run_time=null;
        this.leadout=null;
        this.media_catalog_number=null;
        this.tracks=[];
        this.output_path=null;

        //Musicbrainz data
        this.barcode=null;
        this.asin=null;
        this.mb_release_id=null;
        this.release_date=null;
        this.cd_idx=0;
        this.max_cd_idx=0;

        this.metadata = {
            all_releases: null,
            release: null,
            artist: null,
            media: null
        };
    }

    add_track(t) {
        this.tracks[t.idx]=t;
    }

    update_track(idx,title,metadata) {
        this.tracks[idx].track_title=title;
        this.tracks[idx].metadata.track=metadata;
    }
}

class CompactDiscTrack { 
    constructor () {
        this.idx=null;
        this.start_pos=null;
        this.duration=null;
        this.track_title=null;
        this.metadata={ track: null};
    }
    
    set(idx,start_pos,duration,track_title) {
        this.idx=idx;
        this.start_pos=start_pos;
        this.duration=duration;
        this.track_title=track_title;
    }
}

module.exports={AudioCompactDisc, CompactDiscTrack};