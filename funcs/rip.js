//nodeJs libs
const path=require('path');

//abjscdef libs
const { TrackProcessor } = require(__app+'funcs/base/trackProcessor');

var rip_logger={
    log: __log.cdrip,
    err: __log.cdrip_err
};

var rip_logger_desc={
    starting_desc: 'ripping',
    completed_desc: 'ripped',
    backlog_desc: 'unripped audio tracks'
};

module.exports.generate_ripper=function (o) {
    var ripper=new TrackProcessor(o,'rip','rip_state.json',rip_logger,rip_logger_desc);
    ripper=ripper.set_flag('skip',o.argv.skip_rip)
        .set_flag('retry',o.argv.retry_rip)
        .set_next_processor(o.transcoder)
        //.on('activate','',(cd)=>{})   //default   
        .on('start','process',(cd)=>{
            //rip cd!
            if (!ripper.skip_flag) {
                var next_state=ripper.obj_state.get_next_incomplete_state();  
                if (next_state!=0) {
                    //not last track
                    ripper.process_track(next_state,next_state)     //Rip this track
                        .then((ok)=>{ripper.cb_start_process(cd);}) //Keep ripping!
                        .catch((err)=>{
                            ripper.log.err(`Could not process track ${next_state}`);
                            ripper.log.err(err);});                        
                }
                else {
                    ripper.log.log('all tracks appear ripped.');
                }
            }
        })     
        .on('generate','output-track-file',(idx)=>{                        
            var track_str=ripper.padStart(idx.toString(),2,'0');            
            return path.join(ripper.o.path_rip_cache,`track_${track_str}.wav`);
        })
        .on('process','track',(idx,input,output)=>{  
            //ripping input is cd--ignore input param          
            return ripper.o.rip_track(ripper.log,idx,output);
        }); 

    return ripper;
};
