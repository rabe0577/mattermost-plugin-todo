package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
)

// Issue represents a Todo issue
type Issue struct {
	ID            string `json:"id"`
	Message       string `json:"message"`
	PostPermalink string `json:"postPermalink"`
	Description   string `json:"description,omitempty"`
	CreateAt      int64  `json:"create_at"`
	PostID        string `json:"post_id"`
	DueAt         int64  `json:"due_at,omitempty"`
}

// ExtendedIssue extends the information on Issue to be used on the front-end
type ExtendedIssue struct {
	Issue
	ForeignUser     string `json:"user"`
	ForeignList     string `json:"list"`
	ForeignPosition int    `json:"position"`
	AssigneeID      string `json:"assignee_id,omitempty"`
	AssigneeName    string `json:"assignee_name,omitempty"`
}

// ListsIssue for all list issues
type ListsIssue struct {
	In               []*ExtendedIssue `json:"in"`
	My               []*ExtendedIssue `json:"my"`
	Out              []*ExtendedIssue `json:"out"`
	Channel          []*ExtendedIssue `json:"channel,omitempty"`
	ChannelCompleted []*ExtendedIssue `json:"channel_completed,omitempty"`
}

func newIssue(message, postPermalink, description, postID string, dueAt int64) *Issue {
	return &Issue{
		ID:            model.NewId(),
		CreateAt:      model.GetMillis(),
		Message:       message,
		PostPermalink: postPermalink,
		Description:   description,
		PostID:        postID,
		DueAt:         dueAt,
	}
}

func issuesListToString(issues []*ExtendedIssue) string {
	if len(issues) == 0 {
		return "Nothing to do!"
	}

	str := "\n\n"

	for _, issue := range issues {
		createAt := time.Unix(issue.CreateAt/1000, 0)
		str += fmt.Sprintf("* %s\n  * (%s)\n", issue.Message, createAt.Format("January 2, 2006 at 15:04"))
	}

	return str
}

type dueStatus string

const (
	dueStatusOverdue  dueStatus = "overdue"
	dueStatusToday    dueStatus = "today"
	dueStatusUpcoming dueStatus = "upcoming"
)

func buildReminderMessage(issues []*ExtendedIssue, timezone *time.Location) string {
	now := time.Now().In(timezone)

	var privateIssues []*ExtendedIssue
	var groupIssues []*ExtendedIssue

	for _, issue := range issues {
		if issue.ForeignUser == "" {
			privateIssues = append(privateIssues, issue)
			continue
		}

		groupIssues = append(groupIssues, issue)
	}

	sections := []string{}

	if len(groupIssues) > 0 {
		sections = append(sections, buildReminderSection("**Group Tasks**", groupIssues, now, timezone))
	}

	if len(privateIssues) > 0 {
		sections = append(sections, buildReminderSection("**Private Tasks**", privateIssues, now, timezone))
	}

	if len(sections) == 0 {
		return ""
	}

	return "Daily Reminder:\n\n" + strings.Join(sections, "\n\n")
}

func buildReminderSection(title string, issues []*ExtendedIssue, now time.Time, timezone *time.Location) string {
	overdue, today, upcoming := splitIssuesByDue(issues, now, timezone)

	var builder strings.Builder
	builder.WriteString(title)
	builder.WriteString("\n")

	if len(overdue) > 0 {
		builder.WriteString("**Overdue**\n")
		for _, issue := range overdue {
			builder.WriteString(formatReminderLine(issue, dueStatusOverdue, timezone))
		}
	}

	if len(today) > 0 {
		builder.WriteString("**Due Today**\n")
		for _, issue := range today {
			builder.WriteString(formatReminderLine(issue, dueStatusToday, timezone))
		}
	}

	if len(upcoming) > 0 {
		builder.WriteString("**Upcoming**\n")
		for _, issue := range upcoming {
			builder.WriteString(formatReminderLine(issue, dueStatusUpcoming, timezone))
		}
	}

	return strings.TrimSuffix(builder.String(), "\n")
}

func splitIssuesByDue(issues []*ExtendedIssue, now time.Time, timezone *time.Location) (overdue []*ExtendedIssue, today []*ExtendedIssue, upcoming []*ExtendedIssue) {
	for _, issue := range issues {
		dueTime := time.Unix(issue.DueAt/1000, 0).In(timezone)

		switch classifyDueStatus(issue.DueAt, now, dueTime) {
		case dueStatusOverdue:
			overdue = append(overdue, issue)
		case dueStatusToday:
			today = append(today, issue)
		default:
			upcoming = append(upcoming, issue)
		}
	}

	return
}

func classifyDueStatus(dueAt int64, now time.Time, dueTime time.Time) dueStatus {
	if dueAt == 0 {
		return dueStatusUpcoming
	}

	if dueTime.Before(now) {
		return dueStatusOverdue
	}

	if sameDay(now, dueTime) {
		return dueStatusToday
	}

	return dueStatusUpcoming
}

func sameDay(a, b time.Time) bool {
	return a.Year() == b.Year() && a.Month() == b.Month() && a.Day() == b.Day()
}

func formatReminderLine(issue *ExtendedIssue, status dueStatus, timezone *time.Location) string {
	var dueLabel string
	dueTime := time.Unix(issue.DueAt/1000, 0).In(timezone)

	switch status {
	case dueStatusOverdue:
		dueLabel = fmt.Sprintf(":red_circle: Due %s", dueTime.Format("Jan 2 15:04"))
	case dueStatusToday:
		dueLabel = fmt.Sprintf(":large_orange_circle: Due today %s", dueTime.Format("15:04"))
	default:
		if issue.DueAt == 0 {
			dueLabel = ":white_circle: No due date"
		} else {
			dueLabel = fmt.Sprintf(":white_circle: Due %s", dueTime.Format("Jan 2 15:04"))
		}
	}

	return fmt.Sprintf("* %s (%s)\n", issue.Message, dueLabel)
}
