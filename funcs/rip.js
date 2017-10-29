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
                        .catch((err)=>{this.log.err(err);});                        
                }
            }
        })     
        .on('generate','output-track-file',(idx)=>{                        
            var track_str=ripper.padStart(idx.toString(),2,'0');            
            return path.join(ripper.o.path_rip_cache,`track_${track_str}.wav`);
        })
        .on('process','track',(idx,input,output)=>{  
            //ripping input is cd--ignore input param          
            return ripper.o.rip_track(ripper.log,idx,output)
        });

    return ripper;
};

//move to discid
/**
 * this.rip_path=path.join(o.path_temp_dir,cd.discid_cdindex);
 * 
    mk_tmp_dir() {
        return new Promise((resolve,reject)=>{
            mkdirp(this.rip_path,(err)=>{
                if (err) { reject(err);}
                else {resolve(true);}
            });
        });
    }
 */
/*
class CompactDiscRip {
    constructor (o,cd) {
        this.o=o;
        this.cd=cd;
        this.first_rip=true;
        this.can_transcode=false;
        this.can_tag=false;
        
        this.log={

        };                          
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
       
        this.rip_state.start(next_track);
       
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

    
    //event designer
    //    cd-rip             pre/post
    //    track-rip          pre/post
    //    track-transcode    pre/post


    

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

module.exports={CompactDiscRip};*/