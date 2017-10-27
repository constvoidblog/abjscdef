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
        
        this.path_temp_dir=this.err_path;
        this.path_music_dir=this.err_path;
        this.path_cdrom=this.err_path;

        this.cfg_transcode=['flac'];
    }  

    transcode_flac(transcode_cfg,track_num,input) { missing_func(); }
    is_cd_present() { missing_func(); }
    eject_cd()      { missing_func(); }
    get_cd_data()   { missing_func(); }
    get_album_path(cd)   { missing_func(); }
    rip_track(rip_state,track_idx)    { missing_func(); }

    missing_func() {
        //Throw an exception?
        return false;
    }
}

module.exports=BaseOptions;