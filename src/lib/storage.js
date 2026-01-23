import ScratchStorage from 'scratch-storage';

import defaultProject from './default-project';
import customLibraryAssets from './custom-library-assets';
import customSprites from './libraries/custom-sprites.json';
import customBackdrops from './libraries/custom-backdrops.json';

/**
 * Wrapper for ScratchStorage which adds default web sources.
 * @todo make this more configurable
 */
class Storage extends ScratchStorage {
    constructor () {
        super();
        // Default to the public Scratch asset/project hosts so library assets
        // load even if a caller forgets to configure them explicitly.
        this.assetHost = 'https://assets.scratch.mit.edu';
        this.projectHost = 'https://projects.scratch.mit.edu';
        // Map assetId -> rawURL for custom library assets (so we can serve them locally)
        this._customAssetMap = new Map();
        customSprites.forEach(entry => {
            const c = entry.costumes && entry.costumes[0];
            if (c && c.assetId && (entry.rawURL || c.rawURL)) {
                this._customAssetMap.set(c.assetId, entry.rawURL || c.rawURL);
            }
        });
        customBackdrops.forEach(entry => {
            if (entry.assetId && entry.rawURL) {
                this._customAssetMap.set(entry.assetId, entry.rawURL);
            }
        });
        this.cacheDefaultProject();
        this.cacheCustomLibraryAssets();
    }
    addOfficialScratchWebStores () {
        this.addWebStore(
            [this.AssetType.Project],
            this.getProjectGetConfig.bind(this),
            this.getProjectCreateConfig.bind(this),
            this.getProjectUpdateConfig.bind(this)
        );
        this.addWebStore(
            [this.AssetType.ImageVector, this.AssetType.ImageBitmap, this.AssetType.Sound],
            this.getAssetGetConfig.bind(this),
            // We set both the create and update configs to the same method because
            // storage assumes it should update if there is an assetId, but the
            // asset store uses the assetId as part of the create URI.
            this.getAssetCreateConfig.bind(this),
            this.getAssetCreateConfig.bind(this)
        );
        this.addWebStore(
            [this.AssetType.Sound],
            asset => `static/extension-assets/scratch3_music/${asset.assetId}.${asset.dataFormat}`
        );
    }
    setProjectHost (projectHost) {
        this.projectHost = projectHost;
    }
    setProjectToken (projectToken) {
        this.projectToken = projectToken;
    }
    getProjectGetConfig (projectAsset) {
        const path = `${this.projectHost}/${projectAsset.assetId}`;
        const qs = this.projectToken ? `?token=${this.projectToken}` : '';
        return path + qs;
    }
    getProjectCreateConfig () {
        return {
            url: `${this.projectHost}/`,
            withCredentials: true
        };
    }
    getProjectUpdateConfig (projectAsset) {
        return {
            url: `${this.projectHost}/${projectAsset.assetId}`,
            withCredentials: true
        };
    }
    setAssetHost (assetHost) {
        this.assetHost = assetHost;
    }
    getAssetGetConfig (asset) {
        // If assetId belongs to our custom library, serve from the declared rawURL (local /static/custom-library/*)
        if (this._customAssetMap.has(asset.assetId)) {
            const raw = this._customAssetMap.get(asset.assetId);
            const base = raw.startsWith('http') ? raw : `${window.location.origin}/${raw}`;
            return base;
        }
        return `${this.assetHost}/internalapi/asset/${asset.assetId}.${asset.dataFormat}/get/`;
    }
    getAssetCreateConfig (asset) {
        return {
            // There is no such thing as updating assets, but storage assumes it
            // should update if there is an assetId, and the asset store uses the
            // assetId as part of the create URI. So, force the method to POST.
            // Then when storage finds this config to use for the "update", still POSTs
            method: 'post',
            url: `${this.assetHost}/${asset.assetId}.${asset.dataFormat}`,
            withCredentials: true
        };
    }
    setTranslatorFunction (translator) {
        this.translator = translator;
        this.cacheDefaultProject();
    }
    cacheDefaultProject () {
        const defaultProjectAssets = defaultProject(this.translator);
        defaultProjectAssets.forEach(asset => this.builtinHelper._store(
            this.AssetType[asset.assetType],
            this.DataFormat[asset.dataFormat],
            asset.data,
            asset.id
        ));
    }
    cacheCustomLibraryAssets () {
        const assets = customLibraryAssets();
        assets.forEach(asset => this.builtinHelper._store(
            this.AssetType[asset.assetType],
            this.DataFormat[asset.dataFormat],
            asset.data,
            asset.id
        ));
    }
}

const storage = new Storage();

export default storage;
