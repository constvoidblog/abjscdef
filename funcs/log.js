var winston=require('winston');

var abjscdef_levels= {
    levels: {
        cdrip_err:          0,
        transcode_err:      1,
        metadata_err:       2,
        tag_err:            3,
        abjscdef_err:       4,
        cdrip:              5,
        transcode:          6,
        metadata:           7,
        tag:                8,
        abjscdef:           9
    },  
    colors: {
        cdrip_err:          'red',
        transcode_err:      'red',
        metadata_err:       'red',
        tag_err:            'red',
        abjscdef_err:       'red',
        cdrip:              'blue',
        transcode:          'cyan',
        metadata:           'white',
        tag:                'gray',
        abjscdef:           'green'
    }
};

global.__log= module.exports = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: 'all'
        })
    ],
    level: 'abjscdef',
    levels: abjscdef_levels.levels,
    colors: abjscdef_levels.colors
});

//__log.abjscdef('hello!');