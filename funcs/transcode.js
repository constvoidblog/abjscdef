const path=require('path');
const mkdirp=require('mkdirp');

//abjscdef require
const { CDAudioTrackState }     = require(__app+'funcs/base/cdaudioTrackState');
const { TranscodeCfgHandler }   = require(__app+'funcs/base/transcodeCfgHandler');
const { Tag }                   = require(__app+'funcs/tag');

var transcode_logger =  {
    log: __log.transcode,
    err: __log.transcode_err
};

class TranscodeCfg extends CDAudioTrackState  {
    constructor (transcode_fmt,cd,o,rip_path) {
        super(cd,o,rip_path,
            __argv.retry_transcode,
            `transcode_state_${transcode_fmt}.json`,
            transcode_logger,
            { 
                start_desc:     `transcoding ${transcode_fmt}`,
                complete_desc:  `transcoded ${transcode_fmt}`
            });
        
        this.transcode_fmt=transcode_fmt;
        switch(this.transcode_fmt) {
        case 'flac': this.file_extension='flac';   break; 
        }
        
        this.album_path=this.o.get_album_path(this.cd,this.transcode_fmt);
        this.track_files=[];   
        this.can_tag=false;
    }

    activate_tagger(tagger) {
        this.can_tag=true;
        this.tagger=tagger;
    }
    /**
     * Transcode track
     * @param {Number} t 
     * @param {String} input_file 
     */
    operate_on_track(t,input_file) {
        switch(this.transcode_fmt) {
        case 'flac':
            return this.o.transcode_flac(this,t,input_file);
        default:
            this.log.er(`unknown transcode option ${this.transcode_fmt}`);
            return null;
        }
    }

    /** For use by historical tag */
    get_transcoded_output(t) {
        return path.join(this.album_path,this.track_files[t]);
    }

    downstream_process(t,input_obj){ 
        if (this.can_tag) {
            this.tagger.process_cfg(this.transcode_fmt,t,input_obj);
        }
    }

    /**
     * Return original input wav file for this transcoding configuration.
     * @param {Number} t - track number 
     */
    get_backlog_input_obj(t) {
        var track_str=this.padStart(t.toString(),2,'0');
        return path.join(this.rip_path,`track_${track_str}.wav`);
    }

    /** For use by containing transcoder object */

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
}

//One transcode obj per album per ripper
class Transcode extends TranscodeCfgHandler {
    constructor (o,cd,rip_path) {
        super(o,cd,rip_path,transcode_logger,
            {
                history_desc: 'transcode'
            });
        this.can_tag=false; 
    }

    generate_cfg_obj(cfg_fmt) {
        return  new TranscodeCfg(cfg_fmt,this.cd,this.o,this.rip_path);
    }

    //Hope that this works...and the pass by ref is 'sticky'
    finalize_cfg_initialization(cfg) {
        cfg.prep_track_files();
        return cfg.mk_album_dir();
    }

    prep_track_files() {
        this.log.log('get track output file names');
        Object.keys(this.cfgs).forEach((cfg)=> {
            this.cfgs[cfg].prep_track_files();
        });
    }

    activate_tagging(cd) {
        this.tagger=new Tag(this.o,cd,this.rip_path);
        this.tagger.init()
            .then((ok)=>{
                Object.keys(this.cfgs).forEach((cfg)=> {
                    this.cfgs[cfg].activate_tagger(this.tagger);
                });
                this.can_tag=true;
            });        
    }
  
}


module.exports={Transcode};