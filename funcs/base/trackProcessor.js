//Usage:
//const { CDAudioTrackState } = require(__app+'funcs/base/cdaudioTrackState');

/**
 * The idea is to use this class to figure out how to 
 */

//nodeJs libs
const fs=require('fs');
const path=require('path');

//abjscdef libs
const { StateStatus } = require(__app+'funcs/state');

/**
 * Stateful cd tracks, extend for processing individual tracks 
 */
class TrackProcessor {
    /**
     * Logging functions
     * @typedef {Object} LogStructure
     * @property {function} log - stdout logging function
     * @property {function} err - stderr logging function
     */

    /**
      * Log description
      @typedef {Object} LogDescription
      @property {String} starting_desc - Description of processing that is starting
      @property {String} completed_desc - Description of processing that just completed.
      @property {String} backlog_desc - Description of processing that just completed.      
      */

    /** Prepare a cd's worth of audio tracks for processing
     * @param {Object} cd - cd object
     * @param {Object} o - option object
     * @param {string} rip_path - path caching state & source audio
     * @param {boolean} retry_flag - __argv.[some param]
     * @param {LogStructure} log - logger settings
     * @param {LogDescription} log_desc - starting / completed descriptions 
     */
    constructor (o,activation_verb,state_file,log,log_desc) {
        this.o=o;        
        this.activation_verb=activation_verb;
        this.state_file=state_file;
        this.log=log;            //log.log, log.err
        this.log_desc=log_desc;  //log_desc.start_desc, log_desc.complete_desc, log_desc.history_desc
        
        //defaults
        this.cd=null;
        this.next_processor=null;
        this.prior_processor=null;
        
        this.can_do_flag=false;
        this.retry_flag=false;
        this.skip_flag=false;

        this.cb_activate=this.noop_promise;
        this.cb_start_process=this.default_start_process;        
        this.cb_start_track=this.noop;
        this.cb_start_backlog=this.default_start_backlog;
        this.cb_process_track=this.noop_promise; 
        this.cb_process_backlog=this.default_process_backlog;
        this.cb_done_track=this.default_done_track;
        this.cb_done_backlog=this.noop;
        this.cb_generate_input_track_file=this.noop_generate;
        this.cb_generate_output_track_file=this.noop_generate;

        this.activate_cache=[];
    }

/**
 * Backlog Detail
 *    Ripping starts at the next incomplete track
 *    if incomplete track > 1, then backlog is 1..last complete track
 *    ripping backlog processing should consider iterating across each track, and passing on a process backlog event in parallel
 *    non-ripping backlog processing should start_track and propogate down as usual
 *    how to test? should there be a --test option???
 */
    default_start_process(cd){
        //cache cd
        this.cd=cd;
        this.o.cd=cd;
    }
    default_done_track (idx,input,output) {
        this.log.log(`send track ${idx} on to ${this.next_processor.activation_verb}`);
        this.next_processor.process_track(idx,output)
            .catch((err)=>{
                throw err;
            });
    }

    noop_promise(cd) { return new Promise((resolve)=>{resolve(cd);});}
    noop(track_idx,input_obj) {return input_obj;}
    /**
     *   new (o,'tag.json',tag_logger,)
     *      .set_flag('retry',__argv.xxx)
     *      .set_flag('skip',__argv.yyy)
     *      .
     * @param {*} flag 
     * @param {*} value 
     */

    noop_generate(t,input) { return input;}

    set_flag(flag,value) {
        switch(flag.toLowerCase()) {
        case 'retry':
            this.retry_flag=value;
            break;
        case 'skip':
            this.skip_flag=value;
            break;
        }
        return this;
    }

    set_prior_processor(track_processor) {
        this.prior_processor=track_processor;
        return this;
    }
    set_next_processor(track_processor) {
        if (track_processor!=undefined) {
            track_processor.set_prior_processor(this);
        }
        this.next_processor=track_processor;       
        return this;
    }

    did_track_complete(idx) {
        return this.obj_state.is_complete(idx);
    }

    //activate(cd) returns Promise
    //start process 
    //start track (t,input)
    //start backlog
    //process track (t,input,output)
    //process backlog
    //generate input track file (t,input)
    //generate output track file (t,modified input,orig input)
    //generate backlog file
    //done track (t,input,output)
    //done backlog
    on(event_verb,event_noun,cb) {
        switch(event_verb.toLowerCase()) {  
        case 'activate':
            this.cb_activate=cb;
            break;
        case 'start':
            switch(event_noun.toLowerCase()) {
            case 'process':
                this.cb_start_process=cb;
                break;  
            case 'track':
                this.cb_start_track=cb;
                break;
            case 'backlog':
                this.cb_start_backlog=cb;
                break;
            }     
            break;

        case 'process':
            switch(event_noun.toLowerCase()) {
            case 'track':
                //operate_on_track(t,input_obj) 
                this.cb_process_track=cb;
                break;
            case 'backlog':
                //get_backlog_input_obj(t) {}
                this.cb_process_backlog=cb;
                break;
            }
            break;

        case 'done':
            switch(event_noun.toLowerCase()) {
            case 'track':
                this.cb_done_track=cb;
                break;
            case 'backlog':
                this.cb_done_backlog=cb;
                break;
            }
            break;

        case 'generate':
            //cb(input)
            switch(event_noun.toLowerCase()) {
            case 'input-track-file':
                this.cb_generate_input_track_file=cb;
                break;
            case 'output-track-file':
                this.cb_generate_output_track_file=cb;
                break;
            
            case 'backlog-file':
                this.cb_generate_backlog_file=cb;
                break;
            }
            break;
        
        }

        return this;
    }

    /**
     * 
     * @param {*} cd 
     * @return {Promise}
     */
    activate(verb,cd) {
        //this.log.log(`my verb is ${this.activation_verb}, got ${verb}.`); //DBG
        if (verb==this.activation_verb) {
            this.log.log(`activating ${verb}!`);
            this.cd=cd;            
            this.init()
                .then((states)=>{ return this.cb_activate(cd); })
                .then((cd)=>{        
                    this.can_do_flag=true;           
                    this.cb_start_process(cd);                    
                    this.cb_start_backlog(1,0);
                    if (this.activate_cache.length>0) {
                        this.log.log(`Activate ${this.activate_cache.length} downstream processors:`);
                        this.activate_cache.forEach((i)=>{
                            this.activate(i[0],i[1]);
                        }); 
                    }
                })
                .catch((err)=>{
                    this.log.err(err);
                });
        }
        else {        
            if  (this.can_do_flag) { 
                //this.log.log(`pass ${verb} on.`) //DBG
                return this.next_processor.activate(verb,cd);
            }
            else {
                //If for some reason this processor hasn't yet loaded states, wait until 
                //states have been loaded before activating downstream processors.
                this.log.log(`cache ${verb} until ${this.activation_verb} is active`);
                this.activate_cache.push([verb,cd]);
            }
        }
    }


    /**
     * @public
     * Initialize state:
     * 1. Remove state if forcing a retry (via this.retry_flag)
     * 2. Load prior state if prior state is present
     * 3. Create new state if no prior state present (eg new cd or result of this.retry_flag)     
     */ 
    init() {
        if (this.retry_flag)  {
            this.remove_if_exists(path.join(this.o.path_rip_cache,this.state_file));
        }
        this.obj_state=new StateStatus(this.log,this.cd.tracks.length-1,this.o.path_rip_cache,this.state_file);        
        return this.obj_state.init_state();
    }

    /**
     * @private
     * Remove a file if it exists
     * @param {string} f - path to remove
     */
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

    //TODO - should be using events really...
    process_backlog(t,input_obj) {
        return this.cb_process_backlog(t,input_obj);
    }
    /**
     * @public
     * Complete unprocessed work, or if already done, pass on to next state in case 
     * it has work to do.
     * @param {*} t - track number 
     * @param {*} input_obj - input parameters
     */
    default_process_backlog(t,input_obj) {
        if (!this.skip_flag)  {
            //do work
            //this.log.log(`backlog - examine track ${t}`);
            //console.log(this.obj_state.states[t]);
            if (!this.can_do_flag) {
              
                this.log.log(`backlog - ${this.log_desc.backlog_desc} still inactive, can't process ${t}`);               
                return('not yet active');
                
            }
            else if (this.obj_state.is_incomplete(t)) {
                //reprocess t
                this.log.log(`backlog - process ${this.log_desc.backlog_desc} ${t}  `);
                return this.process_track(t,input_obj);
            }    
            else {
                //t already done, pass on to next state
                var modified_input_obj=this.cb_generate_input_track_file(t,input_obj);
                var output_file_obj=this.cb_generate_output_track_file(t,modified_input_obj,input_obj);
                
                this.log.log(`backlog - already processed track ${t}`);
                return new Promise((resolve,reject)=>{resolve('ok')});                
                //return this.next_processor.process_backlog(t,output_file_obj); //TODO should                 
            }
        }
        else {
            this.log.log(`backlog - skipping ${this.log_desc.backlog_desc}`);
            return new Promise ((resolve,reject)=>{reject('skipping');});
        }
    }

    default_start_backlog(idx,max_track) {  
        //this.log.log(`backlog - start backlog on track ${idx}`); 
        if (max_track==0) {
            //find max ripped track
            max_track=this.obj_state.num_states;
            this.log.log(`backlog - check for incomplete processing (up to track ${max_track})`);
            
        }        
        if (max_track>0) {
            //earlier on, we identified we had backlog -- may have work to do
            if (idx<=max_track) {
                //this.log.log(`backlog - check track ${idx} of ${max_track}`);
                //our current track is withing range of valid tracks - may have work to do
                var output_f = null;
                var should_process_backlog=false;
                if (this.prior_processor == undefined ){
                    //this.log.log('backlog - no prior processor');
                    //don't have a prior processor--use this processor's to figure out input (ie ripper)
                    output_f = this.cb_generate_output_track_file(idx);
                    should_process_backlog=this.did_track_complete(idx); 
                }
                else {
                    //otherwise, ask prior processor for input to currentp rocessor.
                    //console.log(this.prior_processor.obj_state.states[idx]);
                    output_f = this.prior_processor.cb_generate_output_track_file(idx);
                    should_process_backlog=this.prior_processor.did_track_complete(idx);            
                }
                if (should_process_backlog) {
                    this.cb_process_backlog(idx,output_f)  //process backlog
                        .then((ok)=>{this.cb_start_backlog(idx+1,max_track);}) //Process next track of backlog!
                        .catch((err)=>{
                            this.log.err(`backlog - could not process track ${idx}`);
                            this.log.err(err);
                        });                    
                }
                else {
                    //this.log.log(`backlog - track ${idx} already processed`);
                    this.cb_start_backlog(idx+1,max_track);
                }
            }
            else {
                this.log.log('backlog - processing complete');
            }
        } 
        else {
            //max_track==0 because state had nothing that was complete
            this.log.log('backlog - none to process');
        } 
    }

    /**@public 
     * generic track handler
     * @param {number} t - track number (1..max track)
     * @param {Object} input_obj - input parameters (probably a path...)
     */
    process_track(t,input_obj) {
        if (!this.skip_flag){
            return new Promise ((resolve,reject)=>{
                this.cb_start_track(t,input_obj);
                this.log.log(`${this.log_desc.starting_desc} track ${t}`);       
                this.obj_state.start(t);
                var modified_input_obj=this.cb_generate_input_track_file(t,input_obj);
                var output_file_obj=this.cb_generate_output_track_file(t,modified_input_obj,input_obj);
                //this.log.log(`process track: ${t}`);              //DBG
                //this.log.log(`orig input: ${input_obj}`);         //DBG
                //this.log.log(`new input: ${modified_input_obj}`); //DBG
                //this.log.log(`output: ${output_file_obj}`);       //DBG                
                this.cb_process_track(t,modified_input_obj,output_file_obj)
                    .then((output_file) => {
                        this.log.log(`${this.log_desc.completed_desc} track ${t}`);
                        this.obj_state.complete(t);      
                        this.cb_done_track(t,modified_input_obj,output_file_obj);
                        resolve(this);
                    })
                    .catch((err)=>{ 
                        this.log.err(`could not ${this.activation_verb} track ${t}`); 
                        this.log.err(err);
                        reject(err);
                    });
            });
        }
    }

}


module.exports={TrackProcessor};