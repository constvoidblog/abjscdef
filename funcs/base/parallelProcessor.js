//Usage:
//const { ParallelProcessor } = require(__app+'funcs/base/parallelProcessor');


class ParallelProcessor {
    constructor(o,log){
        this.o=o;
        this.log=log;
        this.cb_activate=[];
        this.cb_process_track=[];
        this.cb_process_backlog=[]; 
        this.activation_verb='controller';       
    }

    append_cb(cb_array,cb){
        cb_array.push(cb);
    }

    activate(verb,cd) {              
        this.cb_activate.forEach((cb)=>{cb(verb,cd);});
    }

    for_each_cb(cb_array,t,input_obj) {
        cb_array.forEach((cb)=>{cb(t,input_obj);});
    }

    for_each_cb_promise(cb_array,t,input_obj) {
        return new Promise((resolve,reject)=>{
            var successes=0;
            var cb_count=cb_array.length;
            cb_array.forEach((cb)=>{
                this.log.log(`exec function: ${cb}`);                
                cb(t,input_obj)
                    .then((ok)=>{
                        successes=successes+1;
                        if(cb_count==successes){
                            resolve(ok);
                        }
                    })
                    .catch((err)=>{
                        reject(err);
                    });
            });
        });
    }

    process_track(t,input_obj) {
        return this.for_each_cb_promise(this.cb_process_track,t,input_obj);
        
    }

    process_backlog(max_track) {
        this.cb_process_backlog.forEach((cb)=>{cb(max_track);});        
    }
    
    on(event_verb,event_noun,cb){
        switch(event_verb.toLowerCase()) {  
        case 'activate':
            this.cb_activate.push(cb);
            break;

        case 'process':
            switch(event_noun.toLowerCase()) {
            case 'track':
                //operate_on_track(t,input_obj) 
                this.cb_process_track.push(cb);
                break;
            case 'backlog':
                //get_backlog_input_obj(t) {}
                this.cb_process_backlog.push(cb);            
                break;
            }
            break;
        }
    
        return this;
    }
    

}



module.exports = { ParallelProcessor };