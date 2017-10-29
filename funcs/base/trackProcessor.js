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
        
        this.can_do_flag=false;
        this.retry_flag=false;
        this.skip_flag=false;

        this.cb_activate=this.noop_promise;
        this.cb_start_process=this.default_start_process;        
        this.cb_start_track=this.noop;
        this.cb_start_backlog=this.noop;
        this.cb_process_track=this.noop_promise; 
        this.cb_process_backlog=this.noop;
        this.cb_done_track=this.default_done_track;
        this.cb_done_backlog=this.noop
        this.cb_generate_input_track_file=this.noop_generate;
        this.cb_generate_output_track_file=this.noop_generate;
    }

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

    set_next_processor(track_processor) {
        this.next_processor=track_processor;
        return this;
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
            this.can_do_flag=true;
            this.init()
                .then((states)=>{ return this.cb_activate(cd); })
                .then((cd)=>{this.cb_start_process(cd);})
                .catch((err)=>{
                    this.log.err(err);
                });
        }
        else {        
            //this.log.log(`pass ${verb} on.`) //DBG
            return this.next_processor.activate(verb,cd);
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


    /**
     * @public
     * Activate any unprocessed backlog
     * @param {number} max_track - upper gate on tracks to process (1 - max_track)
     * 
     */
    process_history(max_track) {
        if (!this.skip_flag) {
            var process_backlog=0;
            this.cb_start_backlog(max_track);
            for (let idx=1; idx<=max_track; idx++) {
                if (this.obj_state.is_incomplete(idx)) {
                    this.cb_process_backlog(idx);
                    this.log.log(`retry: track ${idx} wasn't ${this.log_desc.completed}...retry!`);
                    this.process_track(idx,this.cb_generate_backlog_file(idx));                                                      
                    process_backlog++;
                }          
            } 
            if (process_backlog) {
                this.log.log(`processed a backlog of ${process_backlog} ${this.log.backlog_desc}.`);
            }
            else {
                this.log.log(`no backlog -- all ${this.log.backlog_desc} is caught up!`);
            }
            this.cb_done_backlog(process_backlog);
        }
    }

}


module.exports={TrackProcessor};