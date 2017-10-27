const path=require('path');
const mkdirp=require('mkdirp');
const fs=require('fs');
const { StateStatus } = require(__app+'funcs/state');


class TranscodeCfg {
    constructor (transcode_fmt,cd,o,rip_path) {
        this.o=o;
        this.transcode_fmt=transcode_fmt;
        this.cd=cd;
        this.rip_path=rip_path
        
        switch(this.transcode_fmt) {
        case 'flac': this.file_extension='flac';   break; 
        }
        
        this.album_path=this.o.get_album_path(this.cd,this.transcode_fmt);
        this.track_files=[];   

        this.encode_state_file=`encode_state_${this.file_extension}.json`;        
    
        this.log= {
            log: __log.transcode,
            err: __log.transcode_err
        };
    }

    init() {
        if (__argv.retry_transcode) {
            this.remove_if_exists(path.join(this.rip_path,this.encode_state_file));
        }
        this.transcode_state=new StateStatus(this.log,this.cd.tracks.length-1,this.rip_path,this.encode_state_file);        
        return this.transcode_state.init_state();   
    }

    remove_if_exists(f) {
        if (fs.existsSync(f)) {
            fs.unlinkSync(f); 
        }   
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


    transcode_history(max_transcode_track) {
        var transcode_backlog=0;
        for (let idx=1; idx<=max_transcode_track; idx++) {
            if (this.transcode_state.is_incomplete(idx)) {
                this.log.log(`Retry: track ${idx} wasn't succesfully transcoded to ${this.transcode_fmt}...retry!`);
                var track_str=this.padStart(idx.toString(),2,'0');
                var input_file=path.join(this.rip_path,`track_${track_str}.wav`);
                this.transcode(idx,input_file);                    
                transcode_backlog++;
            }          
        } 
        if (transcode_backlog) {
            this.log.log(`transcoding a backlog of ${transcode_backlog} ${this.transcode_fmt} files.`);
        }
        else {
            this.log.log(`all ${this.transcode_fmt} transcoding is caught up!`);
        }
    }

    prep_track_files() {
        this.cd.tracks.forEach((track)=> {
            if (track!=null) {
                this.track_files[track.idx]=this.o.get_track_filename(this,track);
            }
        });
    }


    mk_album_dir() {
        return new Promise((resolve,reject)=>{
            mkdirp(this.album_path,(err)=>{
                if (err) { reject(err);}
                else {resolve(this.album_path);}
            });
        });        
    }

    run_transcode(t,input) {
        switch(this.transcode_fmt) {
        case 'flac':
            return this.o.transcode_flac(this,t,input);
        default:
            this.log.er(`unknown transcode option ${transcode_fmt}`);
            return null;
        }
    }

    transcode(t,input) {      
        this.transcode_state.start(t);
        this.run_transcode(t,input)
            .then((encoded_file) => {
                this.log.log(`done transcoding track ${t}`);
                this.transcode_state.complete(t);
                //apply metadata?                
            })
            .catch((err)=>{ this.log.err(err);});
    }
}

//One transcode obj per album per ripper
class Transcode {
    constructor (o,cd,rip_path) {
        this.o=o;
        this.cd=cd;
        this.rip_path=rip_path;
        this.transcode_cfgs={}
        this.log = {
            log: __log.transcode,
            err: __log.transcode_err
        };
    }

    init() {
        var cfg_count=this.o.cfg_transcode.length;
        var cfg_completion=0;
        return new Promise((resolve,reject)=>{
            this.o.cfg_transcode.forEach((transcode_fmt) => {
                var transcode_cfg=new TranscodeCfg(transcode_fmt,this.cd,this.o,this.rip_path);
                transcode_cfg.init()
                    .then((ok)=> {
                        transcode_cfg.prep_track_files();
                        transcode_cfg.mk_album_dir()
                            .then((ok)=>{ 
                                this.transcode_cfgs[transcode_fmt]=transcode_cfg;
                                cfg_completion++;
                                if (cfg_completion==cfg_count) {
                                    resolve(cfg_count);
                                } 
                            })  
                            .catch((err)=>{ this.log.err(err);});
                    })
                    .catch((err)=>{ this.log.err(err);});          
            });
        });
    }


    prep_track_files() {
        this.log.log('get track output file names');
        Object.keys(this.transcode_cfgs).forEach((cfg)=> {
            this.transcode_cfgs[cfg].prep_track_files();
        });
    }

    transcode(t,transcode_input) {
        Object.keys(this.transcode_cfgs).forEach((cfg)=> {
            this.transcode_cfgs[cfg].transcode(t,transcode_input);            
        });
    }

    transcode_history(max_transcode_track) {
        Object.keys(this.transcode_cfgs).forEach((cfg)=> {
            this.log.log(`transcode historical ${cfg}`);
            this.transcode_cfgs[cfg].transcode_history(max_transcode_track);                        
        });        
    }
}


module.exports={Transcode};