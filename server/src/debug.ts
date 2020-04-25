import util from 'util';

// Global static class
class Debug {
    static enabled = false;

    static log(message?: any, ...optionalParams: any[]) {
        if (this.enabled) {
            console.log(util.format(message, ...optionalParams));
        }
    }
};

export default Debug;