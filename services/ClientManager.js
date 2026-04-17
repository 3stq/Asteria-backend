
const onlineStatusCache = new Map();
const ONLINE_STATUS_TTL = 60000;

function onClientConnect(accountId) {
    if (global.OnlineAccountIds) {
        global.OnlineAccountIds.add(accountId);
    }
    onlineStatusCache.delete(accountId);
}

function onClientDisconnect(accountId) {
    if (global.OnlineAccountIds) {
        global.OnlineAccountIds.delete(accountId);
    }
    onlineStatusCache.set(accountId, {
        isOnline: false,
        timestamp: Date.now()
    });
}

function refreshOnlineStatus() {
    if (global.Clients) {
        global.OnlineAccountIds = new Set(global.Clients.map(c => c.accountId));
    }
}

function isUserOnline(accountId) {
    const cached = onlineStatusCache.get(accountId);
    if (cached && Date.now() - cached.timestamp < ONLINE_STATUS_TTL) {
        return cached.isOnline;
    }
    
    const isOnlineInThisWorker = global.Clients && 
        global.Clients.some(client => client.accountId === accountId);
    
    let isInGlobalSet = false;
    if (global.OnlineAccountIds) {
        isInGlobalSet = global.OnlineAccountIds.has(accountId);
    }
    
    if (!global.OnlineAccountIds || 
        (global.Clients && global.OnlineAccountIds.size !== global.Clients.length)) {
        global.OnlineAccountIds = new Set(
            (global.Clients || []).map(c => c.accountId)
        );
        isInGlobalSet = global.OnlineAccountIds.has(accountId);
    }
    
    const isOnline = isOnlineInThisWorker || isInGlobalSet;
    
    onlineStatusCache.set(accountId, {
        isOnline,
        timestamp: Date.now()
    });
    
    return isOnline;
}

global.onClientConnect = onClientConnect;
global.onClientDisconnect = onClientDisconnect;
global.refreshOnlineStatus = refreshOnlineStatus;

if (!global.OnlineAccountIds) {
    global.OnlineAccountIds = new Set();
}

export {
    onClientConnect,
    onClientDisconnect,
    refreshOnlineStatus,
    isUserOnline,
    onlineStatusCache,
    ONLINE_STATUS_TTL
};