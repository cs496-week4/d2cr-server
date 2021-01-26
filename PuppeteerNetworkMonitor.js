class PuppeteerNetworkMonitor {

    constructor(page) {
        this.promisees = [];
        this.page = page;
        this.resourceType = ['image'];
        this.pendingRequests = new Set();
        this.finishedRequestsWithSuccess = new Set();
        this.finishedRequestsWithErrors = new Set();
        page.on('request', (request) => {
            request.continue();
            if (this.resourceType.includes(request.resourceType())) {
                this.pendingRequests.add(request);
                this.promisees.push(
                    new Promise(resolve => {
                        request.resolver = resolve;
                    }),
                );
            }
        });
        page.on('requestfailed', (request) => {
            if (this.resourceType.includes(request.resourceType())) {
                this.pendingRequests.delete(request);
                this.finishedRequestsWithErrors.add(request);
                if (request.resolver) {
                    request.resolver();
                    delete request.resolver;
                }
            }
        });
        page.on('requestfinished', (request) => {
            if (this.resourceType.includes(request.resourceType())) {
                this.pendingRequests.delete(request);
                this.finishedRequestsWithSuccess.add(request);
                if (request.resolver) {
                    request.resolver();
                    delete request.resolver;
                }
            }
        });
    }

    async waitForAllRequests() {
        if (this.pendingRequestCount() === 0) {
            return;
        }
        await Promise.all(this.promisees);
    }

    pendingRequestCount() {
        return this.pendingRequests.size;
    }
}

module.exports = PuppeteerNetworkMonitor;