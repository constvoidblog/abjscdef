//abjscdef require
const { CDAudioTrackState }     = require(__app+'funcs/base/cdaudioTrackState');
const { TranscodeCfgHandler }   = require(__app+'funcs/base/transcodeCfgHandler');

class TagCfg extends CDAudioTrackState {
    constructor (transcode_fmt,cd,o,rip_path, transcoder) {
        super(cd,o,rip_path,
            __argv.retry_tag,
            `tag_state_${transcode_fmt}.json`,
            {
                log: __log.tag,
                err: __log.tag_err
            },
            { 
                start_desc:     `tagging ${transcode_fmt}`,
                complete_desc:  `tagged ${transcode_fmt}`
            });

        this.transcode_fmt=transcode_fmt;
        this.transcoder=transcoder;
    }

    /**
     * Tag a given track
     * @public
     * @param {Number} t - track num 
     * @param {String} input_file - transcoded file 
     */
    operate_on_track(t,input_file) {
        switch(this.transcode_fmt) {
        case 'flac':
            return this.o.tag_flac(this,this.cd,t,input_file);
        default:
            this.log.er(`unknown transcode option ${this.transcode_fmt}`);
            return null;
        }
    }

    /**
     * Return transcoded output file for this transcoding configuration.
     * @param {Number} t - track number 
     */
    get_backget_input_obj(t) {
        return this.transcoder.transcode_cfgs[this.transcode_fmt].get_transcoded_output(t);                
    }
}

class Tag extends TranscodeCfgHandler {
    constructor (o,cd,rip_path) {
        super(o,cd,rip_path,{
            log: __log.tag,
            err: __log.tag_err
        },
        {
            history_desc: 'tag'
        });
    }

    generate_cfg_obj(cfg_fmt) {
        return new TagCfg(cfg_fmt,this.cd,this.o,this.rip_path);
    }
}


module.exports={Tag};