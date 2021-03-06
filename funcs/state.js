const path = require('path');
const fs = require('fs');

class StateStatus {
    constructor(log,state_count,state_path,state_basename) {
        this.log=log;
        this.num_states=state_count;
        this.state_basename=state_basename;
        this.state_file=path.join(state_path,state_basename);
        this.states=new Array(this.num_states);
    }

    reset_state(idx) {
        var state = { state_status: 'unstarted' };
        this.states[idx]=state;
    }

    init_state() {
        return new Promise((resolve,reject)=> {
            //if rip_state.json, process it 
            fs.readFile(this.state_file,(err,data)=>{
                if(err) {
                    if (err.code=='ENOENT') {
                        //otherwise, default 
                        this.log.log(`no ${this.state_basename}, initialize...`);
                                         
                        for (let idx=1; idx<=this.num_states; idx++) {
                            this.reset_state(idx);                         
                        }                   
                        //console.log('made '+this.states.length)
                        resolve(this.states);
                    }
                    else {
                        this.log.err(`${this.state_basename} had issue ${err}`);
                        reject(err);
                    }
                }
                else {
                    this.log.log(`restored state from ${this.state_basename}...`);
                    this.states=JSON.parse(data);

                    //Sanitize state counts
                    for (var idx=1; idx<=this.num_states; idx++) {
                        if (this.states[idx]==undefined) {
                            this.reset_state(idx);
                        }
                    }
                    
                    resolve(true);
                }
            });
        });                

    }

    store() {
        return new Promise((resolve,reject)=>{
            var json=JSON.stringify(this.states);
            //this.log.log(`saving ${this.state_file}`); //DBG
            if (fs.existsSync(this.state_file)) {
                fs.unlinkSync(this.state_file); //very strange error if I don't do this.xx`x`
            }
            fs.writeFile(this.state_file,json,(err)=>{
                if (err) { reject(err); }
                else { resolve (true);}
            }); 
        });
    }

    start(idx) {
        this.states[idx].state_status='started';
        this.store()
            .then((ok)=>{})
            .catch((err)=>{this.log.err(`could not save ${this.state_file}.`); this.log.err(err); });   
    }

    complete(idx) {
        this.states[idx].state_status='completed';
        this.store()
            .then((ok)=>{})
            .catch((err)=>{this.log.err(`could not save ${this.state_file}.`); this.log.err(err); });   
     
    }

    is_incomplete(idx) {
        //console.log('is incomplete?'+idx+' = '+this.states[idx]);
        return this.states[idx].state_status!='completed';
    }

    is_complete(idx) {
        //console.log('is complete?'+idx+' = '+this.states[idx]);
        //if (this.states[idx]==undefined){ 
        //    console.log(this.states);
        //}
        return this.states[idx].state_status=='completed';
    }

    get_next_incomplete_state() {
        //console.log('num states'+this.num_states);
        for (var idx=1; idx<=this.num_states; idx++) {
            if (this.is_incomplete(idx)) {
                return idx;
            }
        }
        return 0;
    }

    //return the last state that is complete
    get_last_complete_state() {
        //console.log('num states'+this.num_states);
        var last_complete=0;
        for (var idx=1; idx<=this.num_states; idx++) {
            if (this.is_incomplete(idx)) {
                return last_complete;
            }
            last_complete=idx;
        }
        return last_complete;
    }
}

module.exports={StateStatus};