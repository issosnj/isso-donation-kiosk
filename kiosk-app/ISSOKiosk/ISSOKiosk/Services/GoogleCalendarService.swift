import Foundation

struct GoogleCalendarEvent: Codable, Identifiable {
    let id: String
    let summary: String
    let start: EventDate
    let end: EventDate
    let description: String?
    
    struct EventDate: Codable {
        let date: String?
        let dateTime: String?
        
        var displayDate: Date? {
            if let dateTime = dateTime {
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                return formatter.date(from: dateTime) ?? ISO8601DateFormatter().date(from: dateTime)
            } else if let date = date {
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd"
                return formatter.date(from: date)
            }
            return nil
        }
    }
}

struct GoogleCalendarFeed: Codable {
    let items: [GoogleCalendarEvent]
}

class GoogleCalendarService {
    static let shared = GoogleCalendarService()
    
    private init() {}
    
    /// Fetches upcoming events from a Google Calendar public feed
    /// - Parameters:
    ///   - calendarUrl: The public Google Calendar URL (embed or iCal format)
    ///   - limit: Maximum number of events to return (default: 10)
    /// - Returns: Array of upcoming calendar events
    func fetchUpcomingEvents(from calendarUrl: String, limit: Int = 10) async throws -> [GoogleCalendarEvent] {
        // Convert embed URL to iCal feed URL if needed
        let iCalUrl = convertToICalUrl(calendarUrl)
        
        guard let url = URL(string: iCalUrl) else {
            throw CalendarError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw CalendarError.fetchFailed
        }
        
        // Parse iCal format
        let events = try parseICalendar(data: data)
        
        // Filter to only upcoming events and sort by date
        let now = Date()
        let upcomingEvents = events
            .filter { event in
                guard let eventDate = event.start.displayDate else { return false }
                return eventDate >= now
            }
            .sorted { event1, event2 in
                guard let date1 = event1.start.displayDate,
                      let date2 = event2.start.displayDate else {
                    return false
                }
                return date1 < date2
            }
            .prefix(limit)
        
        return Array(upcomingEvents)
    }
    
    /// Converts Google Calendar embed URL to iCal feed URL
    private func convertToICalUrl(_ url: String) -> String {
        // If it's already an iCal URL, return as is
        if url.contains("ical") || url.contains("ics") {
            return url
        }
        
        // Extract calendar ID from embed URL
        // Format: https://calendar.google.com/calendar/embed?src=CALENDAR_ID
        if let embedUrl = URL(string: url),
           let components = URLComponents(url: embedUrl, resolvingAgainstBaseURL: false),
           let queryItems = components.queryItems,
           let src = queryItems.first(where: { $0.name == "src" })?.value {
            // Convert to iCal format
            let encodedSrc = src.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? src
            return "https://calendar.google.com/calendar/ical/\(encodedSrc)/public/basic.ics"
        }
        
        // If we can't parse it, try to use it directly
        return url
    }
    
    /// Parses iCalendar format data
    private func parseICalendar(data: Data) throws -> [GoogleCalendarEvent] {
        guard let icalString = String(data: data, encoding: .utf8) else {
            throw CalendarError.invalidData
        }
        
        var events: [GoogleCalendarEvent] = []
        var currentEvent: [String: String] = [:]
        var inEvent = false
        
        let lines = icalString.components(separatedBy: .newlines)
        
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            
            if trimmed == "BEGIN:VEVENT" {
                inEvent = true
                currentEvent = [:]
            } else if trimmed == "END:VEVENT" {
                if inEvent, let event = parseEvent(from: currentEvent) {
                    events.append(event)
                }
                inEvent = false
            } else if inEvent {
                let parts = trimmed.split(separator: ":", maxSplits: 1)
                if parts.count == 2 {
                    let key = String(parts[0]).uppercased()
                    let value = String(parts[1])
                    currentEvent[key] = value
                }
            }
        }
        
        return events
    }
    
    /// Parses a single event from iCal properties
    private func parseEvent(from properties: [String: String]) -> GoogleCalendarEvent? {
        guard let uid = properties["UID"] ?? properties["DTSTART"],
              let summary = properties["SUMMARY"] else {
            return nil
        }
        
        let startDate = properties["DTSTART"] ?? ""
        let endDate = properties["DTEND"] ?? ""
        let description = properties["DESCRIPTION"]
        
        // Parse date format (could be DATE or DATE-TIME)
        let start: GoogleCalendarEvent.EventDate
        let end: GoogleCalendarEvent.EventDate
        
        if startDate.contains("T") {
            start = GoogleCalendarEvent.EventDate(date: nil, dateTime: startDate)
        } else {
            start = GoogleCalendarEvent.EventDate(date: startDate, dateTime: nil)
        }
        
        if endDate.contains("T") {
            end = GoogleCalendarEvent.EventDate(date: nil, dateTime: endDate)
        } else {
            end = GoogleCalendarEvent.EventDate(date: endDate, dateTime: nil)
        }
        
        return GoogleCalendarEvent(
            id: uid,
            summary: summary,
            start: start,
            end: end,
            description: description
        )
    }
}

enum CalendarError: LocalizedError {
    case invalidURL
    case fetchFailed
    case invalidData
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid calendar URL"
        case .fetchFailed:
            return "Failed to fetch calendar events"
        case .invalidData:
            return "Invalid calendar data format"
        }
    }
}

