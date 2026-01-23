import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';

import LibraryComponent from '../components/library/library.jsx';
import snippetLibraryContent from '../lib/libraries/snippets.json';
import sharedMessages from '../lib/shared-messages';
import log from '../lib/log';
import VM from 'scratch-vm';

import {
    LoadingState,
    LoadingStates,
    onLoadedProject,
    requestProjectUpload
} from '../reducers/project-state';
import {
    closeSnippetLibrary,
    openLoadingProject,
    closeLoadingProject
} from '../reducers/modals';
import {setProjectTitle} from '../reducers/project-title';
import {setProjectUnchanged} from '../reducers/project-changed';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Βιβλιοθήκη κώδικα',
        description: 'Heading for the snippet library',
        id: 'gui.snippets.libraryTitle'
    },
    loadError: {
        defaultMessage: 'Το snippet δεν φορτώθηκε.',
        description: 'Error shown when a snippet project cannot load',
        id: 'gui.snippets.loadError'
    }
});

class SnippetLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
    }
    async handleItemSelect (item) {
        const {
            intl,
            loadingState,
            projectChanged,
            requestProjectUpload: requestUpload
        } = this.props;

        if (projectChanged) {
            const ok = confirm(intl.formatMessage(sharedMessages.replaceProjectWarning)); // eslint-disable-line no-alert
            if (!ok) return;
        }

        requestUpload(loadingState);
        this.props.onLoadingStarted();

        let success = false;
        try {
            const res = await fetch(item.projectUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.arrayBuffer();
            try {
                await this.props.vm.loadProject(buffer);
            } catch (binaryErr) {
                const decoder = new TextDecoder('utf-8');
                const projectText = decoder.decode(new Uint8Array(buffer));
                const cleanText = projectText.replace(/^\uFEFF/, '');
                await this.props.vm.loadProject(cleanText);
            }
            this.props.onSetProjectTitle(item.name);
            this.props.onSetProjectUnchanged();
            success = true;
        } catch (e) {
            log.warn(e);
            alert(intl.formatMessage(messages.loadError)); // eslint-disable-line no-alert
        } finally {
            this.props.onLoadingFinished(LoadingState.LOADING_VM_FILE_UPLOAD, success);
        }
    }
    render () {
        if (!this.props.visible) return null;
        return (
            <LibraryComponent
                data={snippetLibraryContent}
                filterable
                id="snippetLibrary"
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

SnippetLibrary.propTypes = {
    intl: intlShape.isRequired,
    loadingState: PropTypes.oneOf(LoadingStates),
    onLoadingFinished: PropTypes.func,
    onLoadingStarted: PropTypes.func,
    onRequestClose: PropTypes.func,
    onSetProjectTitle: PropTypes.func,
    onSetProjectUnchanged: PropTypes.func,
    projectChanged: PropTypes.bool,
    requestProjectUpload: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    loadingState: state.scratchGui.projectState.loadingState,
    projectChanged: state.scratchGui.projectChanged,
    visible: state.scratchGui.modals.snippetLibrary,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onLoadingStarted: () => dispatch(openLoadingProject()),
    onLoadingFinished: (loadingState, success) => {
        dispatch(onLoadedProject(loadingState, true, success));
        dispatch(closeLoadingProject());
        dispatch(closeSnippetLibrary());
    },
    onSetProjectTitle: title => dispatch(setProjectTitle(title)),
    onSetProjectUnchanged: () => dispatch(setProjectUnchanged()),
    requestProjectUpload: loadingState => dispatch(requestProjectUpload(loadingState)),
    onRequestClose: () => dispatch(closeSnippetLibrary())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(SnippetLibrary));
