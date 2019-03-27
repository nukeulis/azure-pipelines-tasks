import * as tl from 'azure-pipelines-task-lib/task';
import { DotnetCoreInstaller } from './installer';
import * as proxyutil from './proxyutil';
import * as authutil from './authutil';
import * as path from 'path';

async function run() {
    // set the console code page to "UTF-8"
    if (tl.osType() === 'Windows_NT') {
        try {
            await tl.exec(path.resolve(process.env.windir, "system32", "chcp.com"), ["65001"]);
        }
        catch (ex) {
            tl.warning(tl.loc("CouldNotSetCodePaging", JSON.stringify(ex)));
        }
    }

    let packageType = tl.getInput('packageType') || 'runtime';
    const version: string = tl.getInput('version');
    if (version) {
        console.log(tl.loc("ToolToInstall", packageType, version));
        await new DotnetCoreInstaller(packageType, version).install();
    }

    const proxy: tl.ProxyConfiguration = tl.getHttpProxyConfiguration();
    if (proxy) {
        proxyutil.setProxy(proxy);
    }

    const feed: string = tl.getInput('auth');
    if (feed) {
        // Get the info the type of feed
        let nugetFeedType = tl.getInput('nuGetFeedType') || 'internal';

        // Make sure the feed type is an expected one
        const normalizedNuGetFeedType = ['internal', 'external'].find(x => nugetFeedType.toUpperCase() === x.toUpperCase());
        if (!normalizedNuGetFeedType) {
            throw new Error(tl.loc('UnknownFeedType', nugetFeedType));
        }
        nugetFeedType = normalizedNuGetFeedType;

        if (nugetFeedType === 'internal') {
            await authutil.addInternalFeed(feed);
        }
        else {
            await authutil.addExternalFeed(feed);
        }
    }
}

const taskManifestPath = path.join(__dirname, "task.json");
tl.debug("Setting resource path to " + taskManifestPath);
tl.setResourcePath(taskManifestPath);

run()
    .then(() => tl.setResult(tl.TaskResult.Succeeded, ""))
    .catch((error) => tl.setResult(tl.TaskResult.Failed, !!error.message ? error.message : error));