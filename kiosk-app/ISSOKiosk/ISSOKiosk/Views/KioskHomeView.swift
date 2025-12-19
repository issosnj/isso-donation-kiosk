import SwiftUI
import CoreImage.CIFilterBuiltins

struct KioskHomeView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var navigationState: AppNavigationState
    @State private var showWhatsAppQR = false
    @State private var showEvents = false
    @State private var showSocialMediaQR: String? = nil
    
    var body: some View {
        ZStack {
            // Background
            Color(.systemBackground)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Top: Temple Name
                if let temple = appState.temple {
                    VStack(spacing: 10) {
                        if let logoUrl = temple.logoUrl, !logoUrl.isEmpty {
                            AsyncImage(url: URL(string: logoUrl)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                            } placeholder: {
                                Image(systemName: "building.2")
                                    .font(.system(size: 50))
                                    .foregroundColor(.gray)
                            }
                            .frame(height: 80)
                            .cornerRadius(8)
                        }
                        
                        Text(temple.name)
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 40)
                    .padding(.horizontal, 40)
                }
                
                Spacer()
                
                // Main: Click to Donate Button
                Button(action: {
                    withAnimation {
                        navigationState.showDonationFlow = true
                    }
                }) {
                    VStack(spacing: 15) {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.white)
                        
                        Text("Click to Donate")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 200)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.blue,
                                Color.blue.opacity(0.8)
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(24)
                    .shadow(color: Color.black.opacity(0.2), radius: 10, x: 0, y: 5)
                }
                .padding(.horizontal, 60)
                .padding(.vertical, 40)
                
                Spacer()
                
                // Bottom: Action Buttons
                VStack(spacing: 20) {
                    // Join WhatsApp
                    if let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink, !whatsAppLink.isEmpty {
                        ActionButton(
                            icon: "message.fill",
                            title: "Join WhatsApp",
                            color: Color.green
                        ) {
                            showWhatsAppQR = true
                        }
                    }
                    
                    // Upcoming Events/Upvas
                    let hasGoogleCalendar = appState.temple?.homeScreenConfig?.googleCalendarLink?.isEmpty == false
                    let hasLocalEvents = (appState.temple?.homeScreenConfig?.localEvents?.isEmpty == false)
                    let hasEventsText = appState.temple?.homeScreenConfig?.eventsText?.isEmpty == false
                    
                    if hasGoogleCalendar || hasLocalEvents || hasEventsText {
                        ActionButton(
                            icon: "calendar",
                            title: "Upcoming Events",
                            color: Color.orange
                        ) {
                            showEvents = true
                        }
                    }
                    
                    // Social Media
                    if let socialMedia = appState.temple?.homeScreenConfig?.socialMedia, !socialMedia.isEmpty {
                        SocialMediaSection(socialMedia: socialMedia) { url in
                            showSocialMediaQR = url
                        }
                    }
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 40)
                
                // Custom Message at Bottom
                if let customMessage = appState.temple?.homeScreenConfig?.customMessage, !customMessage.isEmpty {
                    Text(customMessage)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .padding(.bottom, 30)
                }
            }
        }
        .sheet(isPresented: $showWhatsAppQR) {
            if let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink {
                QRCodeDisplayView(url: whatsAppLink, title: "Join WhatsApp")
            }
        }
        .sheet(isPresented: $showEvents) {
            UnifiedCalendarEventsView(
                googleCalendarLink: appState.temple?.homeScreenConfig?.googleCalendarLink,
                localEvents: appState.temple?.homeScreenConfig?.localEvents,
                eventsText: appState.temple?.homeScreenConfig?.eventsText
            )
        }
        .sheet(item: Binding(
            get: { showSocialMediaQR.map { SocialMediaItem(url: $0) } },
            set: { showSocialMediaQR = $0?.url }
        )) { item in
            QRCodeDisplayView(url: item.url, title: "Social Media")
        }
    }
}

struct ActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 15) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(.white)
                
                Text(title)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(color)
            .cornerRadius(16)
        }
    }
}

struct SocialMediaSection: View {
    let socialMedia: [SocialMediaLink]
    let onTap: (String) -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            Text("Social Media")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.primary)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(socialMedia, id: \.platform) { link in
                        SocialMediaButton(link: link) {
                            onTap(link.url)
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

struct SocialMediaButton: View {
    let link: SocialMediaLink
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: iconForPlatform(link.platform))
                    .font(.system(size: 32))
                    .foregroundColor(.white)
                
                Text(link.platform.capitalized)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
            }
            .frame(width: 100, height: 100)
            .background(colorForPlatform(link.platform))
            .cornerRadius(16)
        }
    }
    
    private func iconForPlatform(_ platform: String) -> String {
        switch platform.lowercased() {
        case "facebook": return "f.circle.fill"
        case "instagram": return "camera.fill"
        case "twitter", "x": return "at"
        case "youtube": return "play.circle.fill"
        case "linkedin": return "link"
        default: return "link"
        }
    }
    
    private func colorForPlatform(_ platform: String) -> Color {
        switch platform.lowercased() {
        case "facebook": return Color(red: 0.26, green: 0.40, blue: 0.70)
        case "instagram": return Color(red: 0.79, green: 0.31, blue: 0.50)
        case "twitter", "x": return Color(red: 0.11, green: 0.63, blue: 0.95)
        case "youtube": return Color(red: 1.0, green: 0.0, blue: 0.0)
        case "linkedin": return Color(red: 0.0, green: 0.47, blue: 0.71)
        default: return Color.blue
        }
    }
}

struct QRCodeDisplayView: View {
    let url: String
    let title: String
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Text("Scan to \(title)")
                    .font(.system(size: 24, weight: .semibold))
                    .padding(.top, 40)
                
                if let qrImage = generateQRCode(from: url) {
                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 300, height: 300)
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(radius: 5)
                }
                
                Text(url)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 40)
                    .multilineTextAlignment(.center)
                
                Spacer()
            }
            .padding()
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func generateQRCode(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        
        let data = string.data(using: .utf8)
        filter.setValue(data, forKey: "inputMessage")
        
        if let outputImage = filter.outputImage {
            let transform = CGAffineTransform(scaleX: 10, y: 10)
            let scaledImage = outputImage.transformed(by: transform)
            
            if let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) {
                return UIImage(cgImage: cgImage)
            }
        }
        
        return nil
    }
}

struct EventsView: View {
    let eventsText: String
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                Text(eventsText)
                    .font(.system(size: 20))
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .navigationTitle("Upcoming Events/Upvas")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct UnifiedCalendarEventsView: View {
    let googleCalendarLink: String?
    let localEvents: [LocalEvent]?
    let eventsText: String?
    @Environment(\.dismiss) var dismiss
    @State private var googleEvents: [GoogleCalendarEvent] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedView: CalendarViewType = .calendar
    
    enum CalendarViewType {
        case calendar, list
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // View Toggle
                Picker("View", selection: $selectedView) {
                    Text("Calendar").tag(CalendarViewType.calendar)
                    Text("List").tag(CalendarViewType.list)
                }
                .pickerStyle(.segmented)
                .padding()
                
                if selectedView == .calendar {
                    CalendarMonthView(
                        googleEvents: googleEvents,
                        localEvents: localEvents ?? [],
                        eventsText: eventsText
                    )
                } else {
                    EventsListView(
                        googleEvents: googleEvents,
                        localEvents: localEvents ?? [],
                        eventsText: eventsText
                    )
                }
            }
            .navigationTitle("Upcoming Events")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .task {
                await loadGoogleEvents()
            }
        }
    }
    
    private func loadGoogleEvents() async {
        guard let calendarUrl = googleCalendarLink, !calendarUrl.isEmpty else {
            await MainActor.run {
                self.isLoading = false
            }
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let fetchedEvents = try await GoogleCalendarService.shared.fetchUpcomingEvents(from: calendarUrl, limit: 50)
            await MainActor.run {
                self.googleEvents = fetchedEvents
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
}

struct CalendarMonthView: View {
    let googleEvents: [GoogleCalendarEvent]
    let localEvents: [LocalEvent]
    let eventsText: String?
    @State private var currentDate = Date()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Month Navigation
                HStack {
                    Button(action: { currentDate = Calendar.current.date(byAdding: .month, value: -1, to: currentDate) ?? currentDate }) {
                        Image(systemName: "chevron.left")
                            .font(.title2)
                    }
                    Spacer()
                    Text(currentDate, style: .date)
                        .font(.title2)
                        .fontWeight(.semibold)
                    Spacer()
                    Button(action: { currentDate = Calendar.current.date(byAdding: .month, value: 1, to: currentDate) ?? currentDate }) {
                        Image(systemName: "chevron.right")
                            .font(.title2)
                    }
                }
                .padding()
                
                // Calendar Grid
                CalendarGridView(
                    date: currentDate,
                    googleEvents: googleEvents,
                    localEvents: localEvents
                )
                
                // Events Text (if provided)
                if let text = eventsText, !text.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Additional Information")
                            .font(.headline)
                        Text(text)
                            .font(.body)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding()
                }
            }
        }
    }
}

struct CalendarGridView: View {
    let date: Date
    let googleEvents: [GoogleCalendarEvent]
    let localEvents: [LocalEvent]
    
    var body: some View {
        let calendar = Calendar.current
        let monthStart = calendar.date(from: calendar.dateComponents([.year, .month], from: date))!
        let monthEnd = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: monthStart)!
        let firstWeekday = calendar.component(.weekday, from: monthStart) - 1
        let daysInMonth = calendar.range(of: .day, in: .month, for: date)!.count
        
        VStack(spacing: 8) {
            // Weekday headers
            HStack(spacing: 0) {
                ForEach(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                }
            }
            
            // Calendar days
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                // Empty cells for days before month start
                ForEach(0..<firstWeekday, id: \.self) { _ in
                    Color.clear
                        .aspectRatio(1, contentMode: .fit)
                }
                
                // Days of the month
                ForEach(1...daysInMonth, id: \.self) { day in
                    let dayDate = calendar.date(byAdding: .day, value: day - 1, to: monthStart)!
                    let dayEvents = getEventsForDate(dayDate)
                    
                    VStack(spacing: 2) {
                        Text("\(day)")
                            .font(.caption)
                            .fontWeight(isToday(dayDate) ? .bold : .regular)
                            .foregroundColor(isToday(dayDate) ? .blue : .primary)
                        
                        if !dayEvents.isEmpty {
                            Circle()
                                .fill(Color.orange)
                                .frame(width: 6, height: 6)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .aspectRatio(1, contentMode: .fit)
                    .background(isToday(dayDate) ? Color.blue.opacity(0.1) : Color.clear)
                    .cornerRadius(8)
                }
            }
        }
        .padding()
    }
    
    private func isToday(_ date: Date) -> Bool {
        Calendar.current.isDateInToday(date)
    }
    
    private func getEventsForDate(_ date: Date) -> [Any] {
        var events: [Any] = []
        
        // Add Google Calendar events
        for event in googleEvents {
            if let eventDate = event.start.displayDate,
               Calendar.current.isDate(eventDate, inSameDayAs: date) {
                events.append(event)
            }
        }
        
        // Add local events
        for event in localEvents {
            if let eventDate = parseDate(event.date),
               Calendar.current.isDate(eventDate, inSameDayAs: date) {
                events.append(event)
            }
        }
        
        return events
    }
    
    private func parseDate(_ dateString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateString)
    }
}

struct EventsListView: View {
    let googleEvents: [GoogleCalendarEvent]
    let localEvents: [LocalEvent]
    let eventsText: String?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Combine and sort all events
                let allEvents = combineAndSortEvents()
                
                if allEvents.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "calendar")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        Text("No upcoming events")
                            .font(.system(size: 20, weight: .semibold))
                    }
                    .padding()
                } else {
                    ForEach(allEvents.indices, id: \.self) { index in
                        if let googleEvent = allEvents[index] as? GoogleCalendarEvent {
                            EventCard(event: googleEvent)
                        } else if let localEvent = allEvents[index] as? LocalEvent {
                            LocalEventCard(event: localEvent)
                        }
                    }
                }
                
                // Events Text (if provided)
                if let text = eventsText, !text.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Additional Information")
                            .font(.headline)
                        Text(text)
                            .font(.body)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding()
                }
            }
            .padding()
        }
    }
    
    private func combineAndSortEvents() -> [Any] {
        var allEvents: [Any] = []
        
        // Add Google Calendar events
        allEvents.append(contentsOf: googleEvents)
        
        // Add local events
        for localEvent in localEvents {
            if let date = parseDate(localEvent.date),
               date >= Date() {
                allEvents.append(localEvent)
            }
        }
        
        // Sort by date
        return allEvents.sorted { event1, event2 in
            let date1 = getDate(for: event1)
            let date2 = getDate(for: event2)
            return date1 < date2
        }
    }
    
    private func getDate(for event: Any) -> Date {
        if let googleEvent = event as? GoogleCalendarEvent {
            return googleEvent.start.displayDate ?? Date.distantFuture
        } else if let localEvent = event as? LocalEvent {
            return parseDate(localEvent.date) ?? Date.distantFuture
        }
        return Date.distantFuture
    }
    
    private func parseDate(_ dateString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateString)
    }
}

struct LocalEventCard: View {
    let event: LocalEvent
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let date = parseDate(event.date) {
                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.blue)
                    Text(formatDate(date))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)
                }
            }
            
            Text(event.title)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.primary)
            
            if let description = event.description, !description.isEmpty {
                Text(description)
                    .font(.system(size: 16))
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }
            
            if let startTime = event.startTime {
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.gray)
                    if event.isAllDay == true {
                        Text("All Day")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    } else {
                        Text("\(startTime)")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                        if let endTime = event.endTime {
                            Text(" - \(endTime)")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func parseDate(_ dateString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateString)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

struct CalendarEventsView: View {
    let calendarUrl: String
    @Environment(\.dismiss) var dismiss
    @State private var events: [GoogleCalendarEvent] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    VStack(spacing: 20) {
                        ProgressView()
                        Text("Loading events...")
                            .font(.system(size: 18))
                            .foregroundColor(.secondary)
                    }
                } else if let error = errorMessage {
                    VStack(spacing: 20) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)
                        Text("Unable to load events")
                            .font(.system(size: 20, weight: .semibold))
                        Text(error)
                            .font(.system(size: 16))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                } else if events.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "calendar")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        Text("No upcoming events")
                            .font(.system(size: 20, weight: .semibold))
                        Text("Check back later for upcoming events")
                            .font(.system(size: 16))
                            .foregroundColor(.secondary)
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(events) { event in
                                EventCard(event: event)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Upcoming Events")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .task {
                await loadEvents()
            }
        }
    }
    
    private func loadEvents() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let fetchedEvents = try await GoogleCalendarService.shared.fetchUpcomingEvents(from: calendarUrl, limit: 20)
            await MainActor.run {
                self.events = fetchedEvents
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
}

struct EventCard: View {
    let event: GoogleCalendarEvent
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let date = event.start.displayDate {
                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.blue)
                    Text(formatDate(date))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)
                }
            }
            
            Text(event.summary)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.primary)
            
            if let description = event.description, !description.isEmpty {
                Text(description)
                    .font(.system(size: 16))
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }
            
            if let endDate = event.end.displayDate, let startDate = event.start.displayDate {
                if endDate != startDate {
                    HStack {
                        Image(systemName: "clock")
                            .foregroundColor(.gray)
                        Text("Until \(formatDate(endDate))")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct SocialMediaItem: Identifiable {
    let id = UUID()
    let url: String
}

