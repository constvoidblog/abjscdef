/**
 * argv - command line arguments
 */

var argv=require('yargs')
    .usage('Usage: $0 <options>')
    .options({
        'skip_rip' : {        
            group: 'Skip options:',
            describe: 'Skip cd ripping.',
            type: 'boolean'
        },
        'fake_rip' : {
            group: 'Skip options:',
            describe: 'Fake cd ripping',
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

module.exports.get_command_line_args = function() {
    return argv;
}