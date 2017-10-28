const os = require('os');
const path = require ('path');

const BaseOptions = require(__app+'opts/baseOpts');
const { ExecUnixCommand } = require(__app+'opts/unix/unixCmds');
const icedaxParse = require (__app+'opts/unix/icedaxParse');


class UnixOptions extends BaseOptions {
    constructor () { 
        super();   
        this.cmd_cd_is_present=new ExecUnixCommand('cdir'); //from cdtools pkg
        this.cmd_cd_eject=new ExecUnixCommand('eject');
        this.cmd_get_cd_data=new ExecUnixCommand('icedax');
        this.cmd_cd_ripper=new ExecUnixCommand('cdparanoia');
        this.cmd_transcode_flac=new ExecUnixCommand('flac');
        this.cmd_tag_flac=new ExecUnixCommand('metaflac');

        this.path_cdrom='/dev/cdrom';
        this.path_temp_dir=path.join(os.homedir(),'.abjscdef');
        this.path_music_dir=path.join(os.homedir(),'Music');
    }

    is_cd_present(log) {
        return new Promise((resolve,reject) => {        
            this.cmd_cd_is_present.exec(log,[this.path_cdrom], (code,stdout,stderr) => {            
                var stderr_array=stderr.split(os.EOL);
                //console.log(stderr_array[0]);
                if (stderr_array[0].indexOf('no_disc')>-1)  {
                    log.log('No disk!');
                    reject(stderr_array[0]);
                }
                else {
                    log.log('found disk, continue.');
                    resolve(stderr_array[0]);
                }    
            } );
        } );
    }

    eject_cd(log)  {
        return new Promise((resolve,reject) => {
            this.cmd_cd_eject.exec(log, [this.path_cdrom], (code,stdout,stderr) => {
                if (code==0) {
                    //cd tray ejected!
                    resolve(code); 
                }
                else { 
                    //cd tray didn't eject for some reason
                    reject(code); 
                }
            });    
        });
    }

    get_cd_txt(log) {
        //icedax -J -Q -g -H -D /dev/cdrom
        return new Promise((resolve,reject) => {
            //this.cmd_get_cd_data.exec(['-J','-Q','-g','-H','-D',`${this.path_cdrom}`], (code,stdout,stderr) => {
            this.cmd_get_cd_data.exec(log,['-QgJN','-v','catalog,toc,titles','-D',`${this.path_cdrom}`], (code,stdout,stderr) => {                    
                if (code==0) {
                    var cd=icedaxParse.parse_icedax(stderr);
                    resolve(cd);
                }
                else {
                    //failed
                    reject(stderr);
                }
            });
        });
    }

    rip_track(log,track_idx,f) {
        var rip_data={
            start_sector: 0,
            start_track: 0,
            start_time: '0:00.0',
            end_sector: 0,
            end_track: 0,
            end_time: '0:00.0'
        };

        var next_rip_status=0.25; 
        var next_rip_status_sector=0;
        var rip_status_progression={};
        rip_status_progression[0.25]=0.50;
        rip_status_progression[0.50]=0.75;
        rip_status_progression[0.75]=0.90
        rip_status_progression[0.90]=0.95;
        rip_status_progression[0.95]=0.98;
        rip_status_progression[0.98]=0.99;
        rip_status_progression[0.99]=0.995;     

    

        var cur_sector=0;
        var sector_err_count=0;
        var sector_status={
            status_code: 0,
            status_str: 'unstarted',
            sector: 0
        };


        return new Promise((resolve,reject)=> {
            this.cmd_cd_ripper.exec_realtime_io(log,['-we',`${track_idx}`,f],
                (stdout)=>{},
                (stderr)=>{ 
                    //#define CD_FRAMEWORDS (CD_FRAMESIZE_RAW/2)
                    //CD_FRAMESIZE_RAW 2352
                        
                    var stderr_lst=stderr.toString().split(/[\r\n]+/);
                    stderr_lst.forEach((s)=>{
                        var sector_datum=s.match(/##: (-?\d+) \[(\w+)\] @ (\d+)/);
                        if (sector_datum==null) {
                            var sector_start_data=s.match(/Ripping from sector\s+(\d+)\s+\(track\s+(\d+)\s+\[(\d+:\d+\.\d+)\]\)/);                                                       
                            if (sector_start_data!=null) {
                                //Ripping from sector   15196 (track  2 [0:00.00])
                                rip_data.start_sector=parseInt(sector_start_data[1]);
                                rip_data.start_track=parseInt(sector_start_data[2]);
                                rip_data.start_time=sector_start_data[3];
                            }
                            else {
                                var sector_end_data=s.match(/\s+to sector\s+(\d+)\s+\(track\s+(\d+)\s+\[(\d+:\d+\.\d+)\]\)/);
                                if (sector_end_data!=null) {
                                    rip_data.end_sector=parseInt(sector_end_data[1]);                                    
                                    rip_data.end_track=parseInt(sector_end_data[2]);
                                    rip_data.end_time=sector_end_data[3];   
                                    next_rip_status_sector=rip_data.start_sector+next_rip_status*(rip_data.end_sector-rip_data.start_sector);
                                    log.log(`Ripping track ${rip_data.start_track} (${rip_data.start_time} - ${rip_data.end_time}) ${rip_data.start_sector} - ${rip_data.end_sector}`);                                                                   
                                }
                                else {   
                                    if (s.trim()=='Done.') {
                                        log.log(`Done ripping track ${rip_data.start_track}`);                                        
                                    } 
                                    else {
                                        if (s.trim().length!=0) {
                                            log.log('e:'+s);                        
                                        }                           
                                    }
                                }
                            }
                        }
                        else {
                            //##: 0 [read] @ 596232
                            sector_status.status_code=parseInt(sector_datum[1]);
                            sector_status.status_str=sector_datum[2];
                            sector_status.sector=sector_datum[3];
                            
                            cur_sector=sector_status.sector/1176;
                            //console.log(`${cur_sector} of ${rip_data.end_sector} (next status ${next_rip_status})`);
                        
                            if (cur_sector>next_rip_status_sector) {
                                log.log(`${next_rip_status*100}%`);
                                next_rip_status=rip_status_progression[next_rip_status];
                                next_rip_status_sector=rip_data.start_sector+next_rip_status*(rip_data.end_sector-rip_data.start_sector);                            
                            }

                            switch(sector_status.status_code){ 
                            case 0:
                                //read
                                break;
                            case 1:
                                //verify
                                break;
                            case -2:
                                //write
                                break;
                            case 9:
                                //overlap
                                //console.log(sector_datum[0]);
                                break;
                            default:
                                //uhoh!
                                log.err(sector_status);
                                break;
                            }                        
                        }
                    });

                },
                (code,stdout,stderr)=>{
                    if (code==0) {
                        resolve(rip_data);
                    }
                    else {
                        reject(code);
                    }
                });
        });  
    }
    
    get_album_path(cd,transcode_fmt) {
        return path.join(this.path_music_dir,transcode_fmt, cd.artist,`${cd.artist} - ${cd.album}`);
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


    get_track_filename(transcode_cfg,track) {
        var track_str=this.padStart(track.idx.toString(),2,'0');
        return (`${track_str}. ${track.track_title}.${transcode_cfg.file_extension}`);
    }

    transcode_flac(log,transcode_cfg,track_num,input) {
        var transcode_output=path.join(transcode_cfg.album_path,transcode_cfg.track_files[track_num]);        
        return new Promise((resolve,reject)=> {
            log.log(`Transcoding ${input} to ${transcode_output}`);
            this.cmd_transcode_flac.exec(log,['-f','-8','-o',transcode_output,input], (code,stdout,stderr) => {                    
                if (code==0) {
                    var flac_measures=stderr.match(/\.wav: wrote (\d+) bytes, ratio=(\d\.\d+) /);
                    if (flac_measures){
                        //todo show human readable file sizes
                        log.log(`Ratio ${flac_measures[1]}`);
                    }                
                    resolve(transcode_output);
                }
                else {
                    //failed
                    reject(stderr);
                }
            });
        });     
    }

    tag_flac(log,cfg,track_num,input) { 
        //generate tmp tag file
        var album_art_path="";
        this.cmd_tag_flac.exec(log,[album_art_path,`--import-tags-from=${ok}`,input], (code,stdout,stderr)=>{});
    }
    

}



module.exports=UnixOptions;