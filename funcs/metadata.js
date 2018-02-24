const axios = require('axios');
const leven = require('leven');
const fs=require('fs');
const url=require('url');
const path=require('path');
const img_dl=require('image-downloader');

const { StateStatus } = require(__app+'funcs/state');

var metadata_logger= {
    log: __log.metadata,
    err: __log.metadata_err
};

module.exports.lookup_metadata=function (o) {
    var album_metadata=new Metadata(o);
    album_metadata.init()
        .then((response)=>{
            //console.log(__argv);
            if (!o.argv.skip_metadata) {
                //Get metadata
                album_metadata.log.log('starting...');
                album_metadata.get_album_metadata();
            } 
            else {
                album_metadata.log.log('skipping...');
            }
        });
};

class Metadata {
    constructor(o) {
        this.cd=o.cd;
        this.o=o;
        this.ripper=o.ripper;
        this.rip_path=o.path_rip_cache;
        this.cd_state=path.join(this.rip_path,'cd.json');
        this.STATE_CD_METADATA=1;
        this.STATE_CD_ALBUM_ART_ID=2;
        this.STATE_CD_ALBUM_ART_DL=3;
        this.ready=false;
        this.log = metadata_logger;        
    }

    remove_if_exists(f) {
        if (fs.existsSync(f)) {
            fs.unlinkSync(f); 
        }   
    }

    init() {
        if (this.o.argv.retry_metadata_gather) {
            this.log.log('retry activated!');
            this.log.log('removing state');
            this.remove_if_exists(this.cd_state);
            this.remove_if_exists(path.join(this.rip_path,'metadata_state.json'));
        }
        this.metadata_state=new StateStatus(this.log,4,this.rip_path,'metadata_state.json');        
        return this.metadata_state.init_state();
    }

    get_album_metadata() {
        //grab the releases associated with a discid, then lookup data on each release
        //pick the best release and go from there!
        if (this.metadata_state.is_incomplete(this.STATE_CD_METADATA)) {
            this.log.log(`Lookup ${this.cd.discid_cdindex} from music brainz`);
            //https://musicbrainz.org/ws/2/discid/prkkODSX5Zi30lN0og9RXESe4YM-?inc=recordings+artists
            
            this.metadata_state.start(this.STATE_CD_METADATA);
            var cdindex_uri=encodeURIComponent(this.cd.discid_cdindex);
            axios.get(`https://musicbrainz.org/ws/2/discid/${cdindex_uri}?inc=recordings+artists`)
                .then(response=> {  
                    this.process_metadata(response.data);
                    this.store_cd(this.cd_state)
                        .then((response)=>{
                            this.metadata_state.complete(this.STATE_CD_METADATA);
                            this.ready=true;
                            this.o.ripper.activate('transcode',this.cd);                            
                            this.get_album_art();
                        })
                        .catch((err)=>{ this.log.err(err);});
                    //console.log(response);
                })
                .catch(err=>{
                    this.log.err(`Failed to retreive ${cdindex_uri} metadata`);
                    this.log.err(err);
                });
        }
        else {
            this.load(this.cd_state)
                .then((response)=>{
                    this.log.log('restored cd metadata');
                    this.log.log(`restored cd: ${this.cd.artist} - ${this.cd.album}`);
                    this.o.ripper.activate('transcode',this.cd);                    
                    this.get_album_art();  
                })
                .catch((err)=>{ this.log.err(err);});
        }
    }

    get_album_art() {
        if (this.metadata_state.is_incomplete(this.STATE_CD_ALBUM_ART_ID)) {
            //Need to try getting album art
            this.log.log('get album art');
            this.metadata_state.start(this.STATE_CD_ALBUM_ART_ID);   
            var release_uri=encodeURIComponent(this.cd.mb_release_id);
            axios.get(`https://coverartarchive.org/release/${release_uri}`)
                .then((response)=>{
                    this.cd.metadata.artwork=response.data;
                    this.process_coverart_images(response.data.images);
                })
                .catch((err)=>{
                    this.log.err('failed to retrieve album art from coverartarchive.org.');
                    this.log.err(err);
                });
        }     
        else {
            this.log.log('already found album art.');
            this.download_album_art();            
        }          
    }

    process_coverart_images(images) {
        images.forEach((img)=>{
            if ((img.front) && (!this.cd.has_album_art)) {
                this.log.log('found front art');
                this.cd.album_art_url=img.thumbnails.large;
                this.log.log(this.cd.album_art_url);

                //url img extension
                let img_type=path.extname(url.parse(this.cd.album_art_url).pathname);
                this.cd.album_art_path=path.join(this.rip_path,`album_art${img_type}`);
                this.cd.has_album_art=true;
                
                this.metadata_state.complete(this.STATE_CD_ALBUM_ART_ID);
                this.download_album_art();

            }
        });

    }

    download_album_art() {
        if (this.metadata_state.is_incomplete(this.STATE_CD_ALBUM_ART_DL)) {
            this.metadata_state.start(this.STATE_CD_ALBUM_ART_DL);   
            this.log.log(`download ${this.cd_album_art_url}...`);
            let img_dl_opt={
                url:    this.cd.album_art_url,
                dest:  this.cd.album_art_path
            };

            img_dl.image(img_dl_opt)
                .then(({filename,image})=>{
                    this.log.log(`downloaded album art to ${filename}`);
                    this.metadata_state.complete(this.STATE_CD_ALBUM_ART_DL); 
                    this.store_cd(this.cd_state)
                        .then((response)=>{
                            this.o.ripper.activate('tag',this.cd);
                        })
                        .catch((err)=>{
                            this.log.err('couldnt stash cd');
                            this.log.err(err);
                        });
                })
                .catch((err)=>{ 
                    this.log.err('failed to download album art');
                    this.log.err(err);
                });
        }
        else {
            this.log.log('already downloaded album art.');
            this.log.log(`${this.cd.has_album_art}`);
            this.log.log(`${this.cd.album_art_path}`);            
            this.o.ripper.activate('tag',this.cd);
        }
    }

    store_cd(state_file) {
        return new Promise((resolve,reject)=>{
            var json=JSON.stringify(this.cd);
            this.log.log(`saving ${state_file}`);
            fs.writeFile(state_file,json,(err)=>{
                if (err) { reject(err); }
                else { resolve (true);}
            }); 
        });
    }

    load(state_file) {
        return new Promise((resolve,reject)=> {
            fs.readFile(state_file,(err,data)=>{
                if (err) {reject(err);}
                this.log.log(`load from ${state_file}...`);
                this.cd=JSON.parse(data);
                resolve(data);
            });
        });
    }

    process_metadata(data) {
        //        console.log(this.cd);
        //        console.log('parent data---');        
        //        console.log(data);
        this.cd.metadata.all_releases=data;
        this.cd.metadata.release=this.find_best_release(data.releases);
        this.log.log(`best fit = ${this.cd.metadata.release.id}`);
        //console.log(this.cd.metadata.release.title);
        this.apply_metadata(this.cd.metadata.release);
    }

    apply_metadata(r) {
        //r=release
        this.cd.metadata.artist=this.find_artist(this.cd,r['artist-credit']);
        this.cd.artist=this.cd.metadata.artist.name;
        this.cd.album=r.title;
        this.cd.mb_release_id=r.id;
        this.cd.asin=r.asin;
        this.cd.release_date=r.date;
        this.cd.barcode=r.barcode;
        this.cd.max_cd_idx=r.media.length;
        this.cd.metadata.cd=this.find_media(this.cd,r.media);
        //console.log(this.cd.metadata.cd);
        this.cd.cd_idx=this.cd.metadata.cd.position;
        this.apply_track_metadata(this.cd.metadata.cd.tracks);

        this.log.log(this.cd.album);
        this.log.log(this.cd.artist);

    }

    apply_track_metadata(tracks) {
        tracks.forEach((track)=>{
            //console.log(track);
            this.cd.update_track(track.position,track.title,track);
        });
    }

    find_media(cd,media) {
        var found_media=null;
        media.forEach((disc)=>{
            disc.discs.forEach((physical_disc)=>{
                if (physical_disc.id==cd.discid_cdindex) {
                    //console.log(disc);
                    found_media=disc;
                }    
            });
            
        });
        return found_media;
    }

    find_artist(cd,artists) {
        if (cd.cd_text_flag) {
            let lowest_str_dist=1000;
            let cur_str_dist=1000;
            let best_artist=null;
            artists.forEach((artist)=>{
                cur_str_dist=leven(artist.name,cd.artist);
                if (cur_str_dist<lowest_str_dist) {
                    best_artist=artist;
                    lowest_str_dist=cur_str_dist;
                }
            });
            return best_artist;
        }
        else {
            //return first artist...as good as any.
            return artists[0];
        }

    }

    init_release_score() {
        this.score=0;
    }


    match(comment,field,value,match_score,penalty_score){
        if(field.toLowerCase()==value.toLowerCase()) {
            this.score+=match_score;
            this.log.log(`${comment}: ${field}=${value}, add ${match_score}; new score=${this.score}`);
        }
        else {
            this.score+=penalty_score;
            this.log.log(`${comment}: ${field}=${value}, add ${penalty_score}; new score=${this.score}`);
        }
    }

    match_val(comment,field,value,match_score,penalty_score){
        if(field==value) {
            this.score+=match_score;
            this.log.log(`${comment}: ${field}=${value}, add ${match_score}; new score=${this.score}`);
        }
        else {
            this.score+=penalty_score;
            this.log.log(`${comment}: ${field}=${value}, add ${penalty_score}; new score=${this.score}`);
        }
    }


    find_best_release(releases) {
        var GREAT_MATCH=100;
        var GOOD_MATCH=50;
        var OK_MATCH=10;
        var MEH=0;
        var BAD_MATCH=-50;
        var AWFUL_MATCH=-1000;

        var release_score={};
        var release_dict={};
        var me=this;
        if (releases.length>1) {
            releases.forEach((r) => {
                //console.log(r);
                release_dict[r.id]=r;
                this.init_release_score();
                
                //Make sure we can read the track titles
                //TODO - how to make this user specific
                this.match('Language',r['text-representation'].language,'eng',GREAT_MATCH,MEH);
                this.match('Script',r['text-representation'].script,'latn',GREAT_MATCH,MEH);

                //Prioritize countries 
                //TODO - how to make this user specific
                this.match('American', r.country,'us',GREAT_MATCH,MEH);
                this.match('British', r.country,'gb',GREAT_MATCH,MEH);
                this.match('European', r.country,'eu',GOOD_MATCH,MEH);

                //record data matches
                this.match('Status',r.status,'official',GREAT_MATCH,MEH);
                this.match('Quality',r.quality,'normal',OK_MATCH,MEH);

                //Physical matches
                this.match_val('Art',r['cover-art-archive'].artwork,true,GREAT_MATCH,MEH);
                this.match('Packaging',r.packaging,'jewel case',GOOD_MATCH,MEH);

                //Match track count
                //TODO -- match offsets! That would be ideal...
                let cd_track_len=this.cd.tracks.length-1;
                let release_track_len=0;
                r.media.forEach((cd)=> {
                    if (cd['track-count']==cd_track_len) {
                        this.match('media type',cd.format,'cd',GREAT_MATCH,MEH);
                        //console.log('discs:');
                        //console.log(cd.discs);
                        release_track_len=cd['track-count'];
                    }
                });
                this.match_val('Track count',release_track_len,cd_track_len,GREAT_MATCH,AWFUL_MATCH);
                //If we can, match artist and album 
                if (this.cd.cd_text_flag) {
                    //Match Album
                    this.match('Album title',r.title,this.cd.album,GREAT_MATCH,BAD_MATCH);

                    //Match Artist
                    var found_artist=false;
                    r['artist-credit'].forEach((artist) => {
                        this.log.log(`${artist.name} = ${this.cd.artist}?`);
                        if ( (!found_artist) &&(artist.name.toLowerCase()==this.cd.artist.toLowerCase())) {
                            found_artist=true;
                            this.score+=GREAT_MATCH;
                            this.log.log('yes');
                        }
                    });
                    if (!found_artist) {
                        this.score+=AWFUL_MATCH;
                        this.log.err('no artist matches');
                    }
                }

                release_score[r.id]=this.score;
                this.log.log('Final score');
                this.log.log(release_score[r.id]);
            });
            
            let best_match_release_id=0;
            let max_score=-99999;
            //console.log('Finding best matching release');
            for (let r_id in release_score) {
                //console.log(`ID ${r_id} has score ${release_score[r_id]}`);
                if (release_score[r_id]>max_score) {
                    best_match_release_id=r_id;
                    max_score=release_score[r_id];
                    this.log.log(`ID ${r_id} is the best match.`);
                }
            }
            return release_dict[best_match_release_id];
            //todo--find highest scoring id, return that release
        }
        else {
            return releases[0];
        }

    }

}