global.__app=__dirname+'/';

global.__argv=require('yargs')
    .usage('Usage: $0 <options>')
    .options({
        'skip_rip' : {        
            group: 'Skip options:',
            describe: 'Skip cd ripping.',
            type: 'boolean'
        },
        'skip_transcode' : {    
            group: 'Skip options:',
            describe: 'Skip transcoding wav->compressed fmt',
            type: 'boolean'
        },
        'skip_metadata_gather' : {
            group: 'Skip options:',
            describe: 'Skip metadata gathering',
            type: 'boolean'    
        },
        'skip_tag' : {
            group: 'Skip options:',
            describe: 'Skip metadata tagging',
            type: 'boolean'
        },
        'retry_all': {
            group: 'Retry options:',
            describe: 'Retry everything',
            type: 'boolean'
        },
        'retry_rip': {
            group: 'Retry options:',
            describe: 'Retry rip',
            type: 'boolean'
        },
        'retry_transcode': {
            group: 'Retry options:',
            describe: 'Retry transcode wav->compressed fmt',
            type: 'boolean'
        },
        'retry_metadata_gather': {
            group: 'Retry options:',
            describe: 'Retry metadata gathering',
            type: 'boolean'
        },
        'retry_tag' :{
            group: 'Retry options:',
            describe: 'Retry metadata tagging',
            type: 'boolean'
        }

        //redo_rip/transcode/metadata_gather 
    })
    .help('h')
    .example('$0','Rip cd to tagged flac!')
    .alias('h','help')
    .argv;


    

const os=require('os');

const logger=require(global.__app+'funcs/log');
const opts=require(global.__app+'opts/opts');
const {CompactDiscRip}=require(global.__app+'funcs/rip');
const {Metadata}=require(global.__app+'funcs/metadata');


var o=opts.generate_opts();
var album_metadata;
var ripper;

var log={
    log: __log.abjscdef,
    err: __log.abjscdef_err
};

//todo - reject cd w/no audio (ie data only?)
//todo - poll open cd for cd
function process_cd() {
    o.is_cd_present(log)
        .then((ok)=>{
            o.get_cd_txt(log)
                .then((cd)=> {
                    if (cd.cd_text_flag) {
                        log.log('disc has CD text');
                    }
                    else {
                        log.log('no cd text found');
                    }
                    log.log(`start processing '${cd.album}' by ${cd.artist}...`);
                    start_cd_rip(cd);
                    lookup_metadata(cd);
                })
                .catch((err)=>{
                    log.err('couldnt read cd toc');
                    log.err(err);
                });
        })
        .catch((err)=>{
            log.err(err);
            log.log('no cd, ejecting');
            //console.log(err);
            o.eject_cd()
                .then((ok)=>{ log.log('cd ejected - now wait for cd?');})
                .catch((err)=>{ log.err('eject failed');log.err(err);});
        });
}

function lookup_metadata(cd) {
    album_metadata=new Metadata(cd,ripper);
    album_metadata.init()
        .then((response)=>{
            //console.log(__argv);
            if (!__argv.skip_metadata) {
                //Get metadata
                __log.metadata('starting...');
                album_metadata.get_album_metadata();
            } 
            else {
                __log.metadata('skipping...');
            }
        });
}

function start_cd_rip(cd) {
    ripper=new CompactDiscRip(o,cd);
    ripper.init()
        .then((ok)=>{
            if (!__argv.skip_rip) {   
                __log.cdrip('start disc rip..')    
                ripper.process_rip();
            }
            else {
                __log.cdrip('skip ripping..');
                //If we skipped ripping, check to see if we should transcode history.
                if (!__argv.skip_transcode) {
                    ripper.transcode_history();
                }
                else {
                    __log.transcode('skipping...');                    
                }
            }
        });
    //Do we have track and title?  If so, start album art thread
    //Otherwise, pull from musicbrainz missing data
    //if no album art after track and title, start album art thread

    //todo options
    //--skip_rip DONE
    //--force=rerip/retranscode/retag
    //--purge (delete any hangongs)
    //--resume-global-backlog

}

log.log('a better javascript cd encoder to flac');
process_cd();