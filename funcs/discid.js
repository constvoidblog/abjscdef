//todo - reject cd w/no audio (ie data only?)
//todo - poll open cd for cd

var discid_logger = {
    log: __log.abjscdef,
    err: __log.abjscdef_err
};


module.exports.process_cd = function (o) {
    return new Promise((resolve,reject) =>{
        o.is_cd_present(discid_logger)
            .then((ok)=>{
                o.get_cd_txt(discid_logger)
                    .then((cd)=> {
                        if (cd.cd_text_flag) {
                            discid_logger.log('disc has CD text');
                        }
                        else {
                            discid_logger.log('no cd text found');
                        }
                        resolve(cd);
                    })
                    .catch((err)=>{
                        discid_logger.err('couldnt read cd toc');
                        discid_logger.err(err);
                        reject(err);
                    });
            })
            .catch((err)=>{
                discid_logger.err(err);
                discid_logger.log('no cd, ejecting');            
                o.eject_cd()
                    .then((ok)=>{ discid_logger.log('cd ejected - now wait for cd?');})
                    .catch((err)=>{ discid_logger.err('eject failed');discid_logger.err(err); reject(err);});
            });
    });
}