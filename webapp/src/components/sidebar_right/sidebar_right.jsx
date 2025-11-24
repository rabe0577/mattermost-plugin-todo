// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import Scrollbars from 'react-custom-scrollbars';
import {Tooltip, OverlayTrigger} from 'react-bootstrap';

import AddIssue from '../add_issue';
import Button from '../../widget/buttons/button';
import TodoToast from '../../widget/todo_toast';
import CompassIcon from '../icons/compassIcons';

import Menu from '../../widget/menu';
import MenuItem from '../../widget/menuItem';
import MenuWrapper from '../../widget/menuWrapper';

import ToDoIssues from '../todo_issues';
import {isKeyPressed} from '../../utils.js';
import Constants from '../../constants';

import './sidebar_right.scss';

export function renderView(props) {
    return (
        <div
            {...props}
            className='scrollbar--view'
        />);
}

export function renderThumbHorizontal(props) {
    return (
        <div
            {...props}
            className='scrollbar--horizontal'
        />);
}

export function renderThumbVertical(props) {
    return (
        <div
            {...props}
            className='scrollbar--vertical'
        />);
}

const ChannelListName = 'channel';
const MyListName = 'my';
const CompletedListName = 'completed';
const InListName = 'in';

export default class SidebarRight extends React.PureComponent {
    static propTypes = {
        myIssues: PropTypes.array.isRequired,
        inIssues: PropTypes.array.isRequired,
        outIssues: PropTypes.array.isRequired,
        channelIssues: PropTypes.array.isRequired,
        completedChannelIssues: PropTypes.array.isRequired,
        todoToast: PropTypes.object,
        theme: PropTypes.object.isRequired,
        siteURL: PropTypes.string.isRequired,
        rhsState: PropTypes.string,
        channelID: PropTypes.string.isRequired,
        currentUserID: PropTypes.string.isRequired,
        actions: PropTypes.shape({
            remove: PropTypes.func.isRequired,
            complete: PropTypes.func.isRequired,
            accept: PropTypes.func.isRequired,
            bump: PropTypes.func.isRequired,
            fetchAllIssueLists: PropTypes.func.isRequired,
            openAddCard: PropTypes.func.isRequired,
            closeAddCard: PropTypes.func.isRequired,
            openAssigneeModal: PropTypes.func.isRequired,
            setVisible: PropTypes.func.isRequired,
            telemetry: PropTypes.func.isRequired,
        }).isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            list: props.rhsState || ChannelListName,
            showInbox: true,
            showMy: true,
            addTodo: false,
        };
    }

    openList(listName) {
        let normalizedListName = listName;
        if (![ChannelListName, MyListName, CompletedListName].includes(listName)) {
            normalizedListName = ChannelListName;
        }

        if (this.state.list !== normalizedListName) {
            this.setState({list: normalizedListName});
        }
    }

    toggleInbox() {
        this.props.actions.telemetry('toggle_inbox', {action: this.state.showInbox ? 'collapse' : 'expand'});
        this.setState({showInbox: !this.state.showInbox});
    }

    toggleMy() {
        this.props.actions.telemetry('toggle_my', {action: this.state.showMy ? 'collapse' : 'expand'});
        this.setState({showMy: !this.state.showMy});
    }

    componentDidMount() {
        document.addEventListener('keydown', this.handleKeypress);
        this.props.actions.fetchAllIssueLists(false, this.props.channelID);
        this.props.actions.setVisible(true);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeypress);
        this.props.actions.setVisible(false);
    }

    handleKeypress = (e) => {
        if (e.altKey && isKeyPressed(e, Constants.KeyCodes.A)) {
            e.preventDefault();
            this.props.actions.openAddCard('');
        }
    };

    componentDidUpdate(prevProps) {
        if (prevProps.rhsState !== this.props.rhsState) {
            this.openList(this.props.rhsState);
        }

        if (prevProps.channelID !== this.props.channelID) {
            this.props.actions.fetchAllIssueLists(false, this.props.channelID);
        }
    }

    addTodoItem() {
        this.props.actions.openAddCard('');
    }

    closeAddBox = () => {
        this.props.actions.closeAddCard();
    }

    render() {
        const style = getStyle();
        let todos = [];
        let listHeading = 'Channel Todos';
        let addButton = '';
        let inboxList = [];
        const isChannelScopedList = [ChannelListName, MyListName, CompletedListName].includes(this.state.list);

        switch (this.state.list) {
        case CompletedListName:
            todos = this.props.completedChannelIssues;
            listHeading = 'Completed Todos';
            break;
        case MyListName:
            todos = this.props.channelIssues.filter((issue) => issue.assignee_id === this.props.currentUserID);
            listHeading = 'My Todos';
            break;
        case ChannelListName:
        default:
            todos = this.props.channelIssues;
            listHeading = 'Channel Todos';
        }

        addButton = 'Add Todo';
        inboxList = this.props.inIssues;

        let inbox;

        if (inboxList.length > 0) {
            const actionName = this.state.showInbox ? (
                <CompassIcon
                    style={style.todoHeaderIcon}
                    icon='chevron-down'
                />
            ) : (
                <CompassIcon
                    style={style.todoHeaderIcon}
                    icon='chevron-right'
                />
            );
            inbox = (
                <div>
                    <div
                        className='todo-separator'
                        onClick={() => this.toggleInbox()}
                    >
                        {actionName}
                        <div>{`Incoming Todos (${inboxList.length})`}</div>
                    </div>
                        {this.state.showInbox ?
                            <ToDoIssues
                                issues={inboxList}
                                theme={this.props.theme}
                                list={InListName}
                                remove={this.props.actions.remove}
                                complete={this.props.actions.complete}
                                accept={this.props.actions.accept}
                                bump={this.props.actions.bump}
                                showAssignee={false}
                            /> : ''}
                </div>
            );
        }

        let separator;
        if ((inboxList.length > 0) && (todos.length > 0)) {
            const actionName = this.state.showMy ? (
                <CompassIcon
                    style={style.todoHeaderIcon}
                    icon='chevron-down'
                />
            ) : (
                <CompassIcon
                    style={style.todoHeaderIcon}
                    icon='chevron-right'
                />
            );
            separator = (
                <div
                    className='todo-separator'
                    onClick={() => this.toggleMy()}
                >
                    {actionName}
                    {`My Todos (${todos.length})`}
                </div>
            );
        }

        return (
            <React.Fragment>
                <Scrollbars
                    autoHide={true}
                    autoHideTimeout={500}
                    autoHideDuration={500}
                    renderThumbHorizontal={renderThumbHorizontal}
                    renderThumbVertical={renderThumbVertical}
                    renderView={renderView}
                    className='SidebarRight'
                >
                    <div className='todolist-header'>
                        <MenuWrapper>
                            <button
                                className='todolist-header__dropdown'
                            >
                                {listHeading}
                                <CompassIcon
                                    style={style.todoHeaderIcon}
                                    icon='chevron-down'
                                />
                            </button>
                            <Menu position='right'>
                                <MenuItem
                                    onClick={() => this.openList(ChannelListName)}
                                    action={() => this.openList(ChannelListName)}
                                    text={'Channel Todos'}
                                />
                                <MenuItem
                                    onClick={() => this.openList(MyListName)}
                                    action={() => this.openList(MyListName)}
                                    text={'My Todos'}
                                />
                                <MenuItem
                                    onClick={() => this.openList(CompletedListName)}
                                    action={() => this.openList(CompletedListName)}
                                    text={'Completed Todos'}
                                />
                            </Menu>
                        </MenuWrapper>
                        {[ChannelListName, MyListName].includes(this.state.list) && (
                            <OverlayTrigger
                                id='addOverlay'
                                placement={'bottom'}
                                overlay={(
                                    <Tooltip
                                        id='addTooltip'
                                    >
                                        <div className='shortcut-line'>
                                            <mark className='shortcut-key shortcut-key--tooltip'>{'OPT'}</mark>
                                            <mark className='shortcut-key shortcut-key--tooltip'>{'A'}</mark>
                                        </div>
                                    </Tooltip>
                                )}
                            >
                                <div>
                                    <Button
                                        emphasis='primary'
                                        icon={<CompassIcon icon='plus'/>}
                                        size='small'
                                        onClick={() => {
                                            this.props.actions.telemetry('rhs_add', {
                                                list: this.state.list,
                                            });
                                            this.addTodoItem();
                                        }}
                                    >
                                        {addButton}
                                    </Button>
                                </div>
                            </OverlayTrigger>
                        )}
                    </div>
                    <div>
                        {inbox}
                        {separator}
                        <AddIssue
                            theme={this.props.theme}
                            closeAddBox={this.closeAddBox}
                            showAssignee={isChannelScopedList}
                            listType={this.state.list}
                            channelID={this.props.channelID}
                        />
                        {(inboxList.length === 0) || (this.state.showMy && todos.length > 0) ?
                            <ToDoIssues
                                issues={todos}
                                theme={this.props.theme}
                                list={this.state.list}
                                remove={(id) => this.props.actions.remove(id, [ChannelListName, MyListName, CompletedListName].includes(this.state.list) ? this.props.channelID : '')}
                                complete={(id) => this.props.actions.complete(id, [ChannelListName, MyListName].includes(this.state.list) ? this.props.channelID : '')}
                                accept={this.props.actions.accept}
                                bump={this.props.actions.bump}
                                siteURL={this.props.siteURL}
                                showAssignee={isChannelScopedList}
                            /> : ''}
                    </div>
                    {this.props.todoToast && (
                        <TodoToast/>
                    )}
                </Scrollbars>
            </React.Fragment>
        );
    }
}

const getStyle = () => {
    return {
        todoHeaderIcon: {
            fontSize: 18,
            marginLeft: 2,
        },
    };
};
