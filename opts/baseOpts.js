//nodeJs libs
const path=require('path');

//npm libs
const mkdirp=require('mkdirp');

//abjscdef libs
const { MissingCommand }=require(__app+'opts/baseCmds');

class BaseOptions {
    constructor (argv) {
        this.argv=argv;        
        this.err_path='ERROR - Missing Path';
        this.err_cmd=new MissingCommand();

        this.cmd_cd_is_present=this.err_cmd;
        this.cmd_cd_eject=this.err_cmd;
        this.cmd_get_cd_data=this.err_cmd;
        this.cmd_cd_ripper=this.err_cmd;
        

        this.cmd_transcode_flac=this.err_cmd;
        this.cmd_tag_flac=this.err_cmd;

        this.path_temp_dir=this.err_path;
        this.path_music_dir=this.err_path;
        this.path_cdrom=this.err_path;
        this.path_rip_cache=this.err_path;

        this.cfg_transcode=['flac'];

        this.ripper=null;
        this.transcoder=null;
        this.flac_transcoder=null;
        this.flac_tagger=null;
        this.flac_stasher=null;  //sftp, addtl copies, etc etc
        this.flac_done=null; //special--only goes to next after last flac file done
        this.all_done=null; //special--only goes to next after all transcode ops done (last flac, last mp3, last whateves)
        this.cleaner=null; //only runs after all_done
    }  

    transcode_flac(log,transcode_cfg,track_num,input) { this.missing_func(log); }
    generate_flac_tags(log,cd){ this.missing_func(log); }
    tag_flac(log,tag_cfg,cd,t,input_file) { this.missing_func(log); }
    is_cd_present(log) { this.missing_func(log); }
    eject_cd(log)      { this.missing_func(log); }
    get_cd_data(log)   { this.missing_func(log); }
    get_album_path(log,cd)   { this.missing_func(log); }
    rip_track(log,rip_state,track_idx)    { this.missing_func(log); }

    missing_func(log) {
        log.err('development problem--base class has abstract method. This is a bug.');
        //Throw an exception?
        return false;
    }

    mk_tmp_dir() {
        return new Promise((resolve,reject)=>{
            mkdirp(this.path_rip_cache,(err)=>{
                if (err) { reject(err);}
                else {resolve(true);}
            });
        });
    }

    /**
     * @public
     * @param {*} cd
     * @returns {Promise} Promise that path_rip_cache has been created 
     */
    set_rip_cache(log,cd) {
        this.cd=cd;
        this.path_rip_cache=path.join(this.path_temp_dir,cd.discid_cdindex);
        log.log(`rip cache dir: ${this.path_rip_cache}`)
        return this.mk_tmp_dir();
    }
}

module.exports=BaseOptions;