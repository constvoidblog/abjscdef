global.__app=__dirname+'/';

//command line param processing -- first
var argv=require(global.__app+'funcs/argv');
    
//nodeJslibs
const os=require('os');

//abjscdef libs
const logger=require(global.__app+'funcs/log');
const opts=require(global.__app+'opts/opts');
const discid =      require(global.__app+'funcs/discid');
const rip =         require(global.__app+'funcs/rip');
const metadata =    require(global.__app+'funcs/metadata');
const transcode =   require(global.__app+'funcs/transcode');
const tag =         require(global.__app+'funcs/tag');

//Let the games begin.
var abjscdef_logger={
    log:__log.abjscdef,
    err:__log.abjscdef_err
};

var o=opts.generate_opts(argv.get_command_line_args());
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
  });
discid.process_cd(o)
    .then((cd)=>{ return o.set_rip_cache(abjscdef_logger,cd); })
    .then((ok)=>{        
        o.flac_tagger=tag.generate_flac_tagger(o);
        o.flac_transcoder=transcode.generate_flac_transcoder(o);
        o.transcoder=transcode.generate_transcoder(o);        
        o.ripper=rip.generate_ripper(o);
        
        /*
        o.flac_stasher=null;
        o.flac_done=null; //special--only goes to next after last flac file done
        o.all_done=null; //special--only goes to next after all transcode ops done (last flac, last mp3, last whateves)
        o.cleaner=null; //only runs after all_done..should:
            //options: delete completely
            //         leave wav, remove wav  
            //         leave in dir, archive to dir
            //         uncompress, compress
            //         default: compress, archive, remove wav
        */
        o.ripper.activate('rip',o.cd);
        metadata.lookup_metadata(o)
    });


/*
var album_metadata;
var ripper;

var log={
    log: __log.abjscdef,
    err: __log.abjscdef_err
};




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
//process_cd();
*/