const path=require('path');
const mkdirp=require('mkdirp');

//abjscdef require
const { ParallelProcessor }   = require(__app+'funcs/base/parallelProcessor');
const { TrackProcessor } = require(__app+'funcs/base/trackProcessor');

var transcode_logger =  {
    log: __log.transcode,
    err: __log.transcode_err
};

var transcode_logger_desc={
    starting_desc: 'transcoding flac',
    completed_desc: 'transcoded flac',
    backlog_desc: 'wav audio files'
};

module.exports.generate_transcoder=function (o) {
    var p = new ParallelProcessor(o,transcode_logger);
    if (o.cfg_transcode.indexOf('flac')>-1) {
        transcode_logger.log('Add flac to transcode operations.');
        //add flac hooks to transcoder parallel processor 
        p=p.on('activate','', (verb,cd)          =>  {                
                o.flac_transcoder.activate(`${verb} flac`,cd);
             })
            .on('process','track',(idx,input) =>  { o.flac_transcoder.process_track(idx,input); })
            .on('process','backlog',(idx,input)=> { o.flac_transcoder.process_backlog(idx,input); });        
    }    
    return p;
}

module.exports.generate_flac_transcoder=function(o) {
    var flac_transcoder=new TrackProcessor(o,'transcode flac','transcode_flac_state.json',transcode_logger,transcode_logger_desc);
    flac_transcoder=flac_transcoder.set_flag('skip',o.argv.skip_transcode)
        .set_flag('retry',o.argv.retry_transcode)
        .set_next_processor(o.flac_tagger)
        .on('activate','',(cd)=>{
            cd.album_path=o.get_album_path(cd,'flac');
            return new Promise((resolve,reject)=>{
                mkdirp(cd.album_path,(err)=>{
                    if (err) { reject(err);}
                    else {resolve(cd);}
                });
            });  
        })
        .on('generate','output-track-file',(idx)=>{     
            let track_filename=o.get_track_filename(flac_transcoder.cd,idx,'flac');
            return path.join(flac_transcoder.cd.album_path,track_filename);        
        })
        .on('process','track',(idx,input,output)=>{
            return flac_transcoder.o.transcode_flac(flac_transcoder.log,'flac',idx,input,output)
        });

    return flac_transcoder;
};
