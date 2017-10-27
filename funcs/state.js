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

    init_state() {
        return new Promise((resolve,reject)=> {
            //if rip_state.json, process it 
            fs.readFile(this.state_file,(err,data)=>{
                if(err) {
                    if (err.code=='ENOENT') {
                        //otherwise, default 
                        this.log.log(`No ${this.state_basename}, initialize...`);
                                         
                        for (let idx=1; idx<this.num_states; idx++) {
                            var state = { state_status: 'unstarted' };
                            this.states[idx]=state;                            
                        }                        
                        resolve(true);
                    }
                    else {
                        this.log.err(`${this.state_basename} had issue ${err}`);
                        reject(err);
                    }
                }
                else {
                    this.log.log(`Load from ${this.state_basename}...`);
                    this.states=JSON.parse(data);
                    resolve(true);
                }
            });
        });                

    }

    store() {
        return new Promise((resolve,reject)=>{
            var json=JSON.stringify(this.states);
            this.log.log(`Saving ${this.state_file}`);
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
            .catch((err)=>{this.log.err(`Could not save ${this.state_file}.`); this.log.err(err); });   
    }

    complete(idx) {
        this.states[idx].state_status='completed';
        this.store()
            .then((ok)=>{})
            .catch((err)=>{this.log.err(`Could not save ${this.state_file}.`); this.log.err(err); });   
     
    }

    is_incomplete(idx) {
        return this.states[idx].state_status!='completed';
    }

    get_next_incomplete_state() {
        for (var idx=1; idx<=this.num_states; idx++) {
            if (this.is_incomplete(idx)) {
                return idx;
            }
        }
    }
}

module.exports={StateStatus};