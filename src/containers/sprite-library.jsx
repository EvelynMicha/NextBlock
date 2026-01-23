import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, intlShape, defineMessages} from 'react-intl';
import VM from 'scratch-vm';

import defaultSpriteLibraryContent from '../lib/libraries/sprites.json';
import customSpriteLibraryContent from '../lib/libraries/custom-sprites.json';
import randomizeSpritePosition from '../lib/randomize-sprite-position';
import spriteTags from '../lib/libraries/sprite-tags';

import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Sprite',
        description: 'Heading for the sprite library',
        id: 'gui.spriteLibrary.chooseASprite'
    }
});

class SpriteLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
    }
    handleItemSelect (item) {
        // Build a valid SB3 sprite3 file; fall back to item.json if present.
        const spriteTarget = {
            name: item.name,
            isStage: false,
            variables: item.variables || {},
            lists: item.lists || {},
            broadcasts: item.broadcasts || {},
            blocks: item.blocks || {},
            comments: item.comments || {},
            currentCostume: item.currentCostume || 0,
            costumes: item.costumes || [],
            sounds: item.sounds || [],
            volume: item.volume || 100,
            effects: item.effects || {
                color: 0,
                fisheye: 0,
                whirl: 0,
                pixelate: 0,
                mosaic: 0,
                brightness: 0,
                ghost: 0
            },
            layerOrder: item.layerOrder || 1,
            visible: typeof item.visible === 'boolean' ? item.visible : true,
            x: item.x || 0,
            y: item.y || 0,
            size: item.size || 100,
            direction: item.direction || 90,
            draggable: !!item.draggable,
            rotationStyle: item.rotationStyle || 'all around',
            meta: item.meta || {semver: '3.0.0', vm: '0.2.0', agent: 'custom'},
            projectVersion: item.projectVersion || 3
        };
        // Randomize position on the target before adding
        randomizeSpritePosition(spriteTarget);
        this.props.vm.addSprite(JSON.stringify(spriteTarget)).then(() => {
            this.props.onActivateBlocksTab();
        });
    }
    render () {
        return (
            <LibraryComponent
                data={[...defaultSpriteLibraryContent, ...customSpriteLibraryContent]}
                id="spriteLibrary"
                tags={spriteTags}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

SpriteLibrary.propTypes = {
    intl: intlShape.isRequired,
    onActivateBlocksTab: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(SpriteLibrary);
