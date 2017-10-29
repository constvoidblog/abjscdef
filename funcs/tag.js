//abjscdef libs
const { TrackProcessor } = require(__app+'funcs/base/trackProcessor');

var tag_logger =  {
    log: __log.tag,
    err: __log.tag_err
};

function generate_tag_log_desc(fmt) {
    return {
        starting_desc:  `tagging ${fmt}`,
        completed_desc: `tagged ${fmt}`,
        backlog_desc: `${fmt} files`
    };
}



module.exports.generate_flac_tagger=function(o) {
    var flac_tagger=new TrackProcessor(o,'tag flac','tag_flac_state.json',tag_logger,generate_tag_log_desc('flac'));
    flac_tagger=flac_tagger.set_flag('skip',o.argv.skip_tag)
        .set_flag('retry',o.argv.retry_tag)
        .set_next_processor(o.flac_done)  //flac_stasher oneday
        .on('activate','',(cd)=>{            
            flac_tagger.cd=cd;
            return o.generate_flac_tags(flac_tagger.log,cd);
        })
        .on('process','track',(idx,input)=>{
            return flac_tagger.o.tag_flac(flac_tagger.log,flac_tagger.cd,idx,input);
        })
        .on('done','track',(idx,input,output)=>{
            //for now...stop processing
            //todo--add an official "flac done" and single threader object
            flac_tagger.log.log(`Done processing track ${idx} - ${output}!`);
        });
    return flac_tagger;
};