class DisplayableError extends Error {
    constructor(...params) {
        super(...params)
        this.show_to_user = true
    }
}
module.exports = DisplayableError;