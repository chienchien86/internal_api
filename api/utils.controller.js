// for some utility

exports.encodeJID = async function encodeJID(req, res) {
    const { jid } = req.body;
    return res.json({
        encodedJID: encodeURIComponent(jid)
    });
}