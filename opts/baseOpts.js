const { MissingCommand }=require(__app+'opts/baseCmds');

class BaseOptions {
    constructor () {        
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

        this.cfg_transcode=['flac'];
    }  

    transcode_flac(log,transcode_cfg,track_num,input) { this.missing_func(log); }
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
}

module.exports=BaseOptions;