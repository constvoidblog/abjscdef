const os=require('os');

exports.generate_opts= function(argv) {    
    var optionObj;

    switch(os.platform()) {
    case 'linux':
        optionObj =require(__app+'opts/unix/unixOpts');
        break;
    }

    return new optionObj(argv);
}