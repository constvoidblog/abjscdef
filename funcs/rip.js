const path=require('path');
const fs=require('fs');
const mkdirp=require('mkdirp');

const { StateStatus } = require(__app+'funcs/state');
const { Transcode } = require(__app+'funcs/transcode');

class CompactDiscRip {
    constructor (o,cd) {
        this.o=o;
        this.cd=cd;
        this.first_rip=true;
        this.can_transcode=false;
        this.can_tag=false;
        this.rip_path=path.join(o.path_temp_dir,cd.discid_cdindex);
        this.log={
            log: __log.cdrip,
            err: __log.cdrip_err
        };                          
    }

    activate_transcoding(cd) {
        this.log.log('activate transcoding!');
        this.cd=cd;
        this.can_transcode=true;
        this.transcoder=new Transcode(this.o,this.cd,this.rip_path); 
        this.transcoder.init()
            .then((ok)=>{            
                if ((__argv.skip_rip) & (!__argv.skip_transcode)) {
                    this.transcode_history();
                } 
            })
            .catch((err)=>{ this.log.err(err);});
    }

    activate_tagging(cd) {
        this.transcoder.activate_tagging(cd);       
    }

    mk_tmp_dir() {
        return new Promise((resolve,reject)=>{
            mkdirp(this.rip_path,(err)=>{
                if (err) { reject(err);}
                else {resolve(true);}
            });
        });
    }

    padStart(s,targetLength,padString) {
        targetLength = targetLength>>0; //floor if number or convert non-number to 0;
        padString = String(padString || ' ');
        if (s.length > targetLength) {
            return String(s);
        }
        else {
            targetLength = targetLength-s.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
            }
            return padString.slice(0,targetLength) + String(s);
        }
    }

    rip_next_track() {
        var next_track=this.rip_state.get_next_incomplete_state();  
        //var last_track =this.rip_state.num_tracks-1;    
        var track_str=this.padStart(next_track.toString(),2,'0');
        this.log.log(`ripping track: ${track_str}`);
        var track_output=path.join(this.rip_path,`track_${track_str}.wav`);
        this.rip_state.start(next_track);
        this.o.rip_track('cdrip',next_track,track_output)
            .then((rip_status)=> {
                //all done ripping thist rack!
               
                this.log.log(`saving state regarding track ${rip_status.start_track} ripping.`);
                this.rip_state.complete(rip_status.start_track); 
                if (this.can_transcode) {                
                    this.transcoder.process_track(rip_status.start_track,track_output); 
                }                              
                this.rip_next_track();
                
                //create .m3u and clean up cache

            });

        //when ripping, see if we have any transcoding left behind
        if ((this.can_transcode) && (this.first_rip)) {
            this.first_rip=false;
            this.transcode_backlog(next_track);  
        }
    }

    //If a track has been ripped, ask the transcoder to transcode backlog.
    transcode_backlog(next_track) {
        if (next_track>1) {
            var last_encoding=next_track-1;                
            this.log.log(`check for unencoded ripped wavs, track 1 - ${last_encoding}`);                
            this.transcoder.process_history(last_encoding);
        }
    }

    //Since tjhe ripper is the entry into transcoding, if skipping ripping, we need a way to transcode. 
    transcode_history() {
        this.log.log('start transcoding history.');
        if (this.can_transcode) {
            var next_track=this.rip_state.get_next_incomplete_state();  
            this.transcode_backlog(next_track);
        }  
        else {
            this.log.log('cant transcode history yet');
        }
        this.log.log('done transcoding history.');
    }

    /*
    event designer
        cd-rip             pre/post
        track-rip          pre/post
        track-transcode    pre/post


    */

    init() {
        return new Promise( (resolve,reject)=>{
            this.mk_tmp_dir()
                .then((ok)=>{
                    this.rip_state=new StateStatus(this.log,this.cd.tracks.length-1,this.rip_path,'rip_state.json');
                    resolve(this.rip_state.init_state());
                });
        });
    }

    process_rip() {
        this.rip_next_track();
    }
}

module.exports={CompactDiscRip};