import SwiftUI
import CoreImage.CIFilterBuiltins

struct KioskHomeView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var navigationState: AppNavigationState
    @State private var showWhatsAppQR = false
    @State private var showEvents = false
    @State private var showSocialMediaQR: String? = nil
    @State private var showSuggestionBox = false
    
    var body: some View {
        ZStack {
            // Modern gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.white,
                    Color(red: 0.95, green: 0.97, blue: 1.0)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                Spacer()
                
                // Centered content
                VStack(spacing: 40) {
                    // Headers (configurable by admin)
                    VStack(spacing: 12) {
                        // Header 1 (default: "Welcome to Temple Name")
                        Text(header1Text)
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                            .multilineTextAlignment(.center)
                        
                        // Header 2 (default: address)
                        if let header2 = header2Text, !header2.isEmpty {
                            Text(header2)
                                .font(.system(size: 22, weight: .regular))
                                .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(.horizontal, 40)
                    .padding(.top, 20)
                    
                    // Main: Two Taps To Donation Button
                    Button(action: {
                        withAnimation {
                            navigationState.showDonationFlow = true
                        }
                    }) {
                        VStack(spacing: 20) {
                            Image(systemName: "heart.fill")
                                .font(.system(size: 70))
                                .foregroundColor(.white)
                            
                            Text("Two Taps To Donation")
                                .font(.system(size: 38, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: 600)
                        .frame(height: 220)
                        .background(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.2, green: 0.4, blue: 0.8),
                                    Color(red: 0.3, green: 0.5, blue: 0.9)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .cornerRadius(28)
                        .shadow(color: Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.4), radius: 20, x: 0, y: 10)
                    }
                    .padding(.horizontal, 40)
                    
                    // Bottom: Action Buttons (placeholders that activate when data is added)
                    VStack(spacing: 20) {
                        // Quick Actions Section (WhatsApp, Events, Social Media as icons)
                        VStack(spacing: 12) {
                            Text("Quick Actions")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    // Join WhatsApp
                                    if let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink, !whatsAppLink.isEmpty {
                                        ModernQuickActionButton(
                                            icon: "message.fill",
                                            title: "WhatsApp",
                                            color: Color(red: 0.18, green: 0.64, blue: 0.33),
                                            isActive: true
                                        ) {
                                            showWhatsAppQR = true
                                        }
                                    } else {
                                        ModernQuickActionButton(
                                            icon: "message.fill",
                                            title: "WhatsApp",
                                            color: Color.gray.opacity(0.3),
                                            isActive: false
                                        ) {
                                            // Placeholder - inactive
                                        }
                                    }
                                    
                                    // Upcoming Events
                                    let hasGoogleCalendar = appState.temple?.homeScreenConfig?.googleCalendarLink?.isEmpty == false
                                    let hasLocalEvents = (appState.temple?.homeScreenConfig?.localEvents?.isEmpty == false)
                                    let hasEventsText = appState.temple?.homeScreenConfig?.eventsText?.isEmpty == false
                                    let hasEvents = hasGoogleCalendar || hasLocalEvents || hasEventsText
                                    
                                    if hasEvents {
                                        ModernQuickActionButton(
                                            icon: "calendar",
                                            title: "Events",
                                            color: Color(red: 1.0, green: 0.58, blue: 0.0),
                                            isActive: true
                                        ) {
                                            showEvents = true
                                        }
                                    } else {
                                        ModernQuickActionButton(
                                            icon: "calendar",
                                            title: "Events",
                                            color: Color.gray.opacity(0.3),
                                            isActive: false
                                        ) {
                                            // Placeholder - inactive
                                        }
                                    }
                                    
                                    // Social Media
                                    if let socialMedia = appState.temple?.homeScreenConfig?.socialMedia, !socialMedia.isEmpty {
                                        ForEach(socialMedia, id: \.platform) { link in
                                            ModernQuickActionButton(
                                                icon: iconForPlatform(link.platform),
                                                title: link.platform.capitalized,
                                                color: colorForPlatform(link.platform),
                                                isActive: true
                                            ) {
                                                showSocialMediaQR = link.url
                                            }
                                        }
                                    } else {
                                        // Social Media placeholders
                                        ForEach(["facebook", "instagram", "youtube"], id: \.self) { platform in
                                            ModernQuickActionButton(
                                                icon: iconForPlatform(platform),
                                                title: platform.capitalized,
                                                color: Color.gray.opacity(0.3),
                                                isActive: false
                                            ) {
                                                // Placeholder - inactive
                                            }
                                        }
                                    }
                                    
                                    // Suggestion Box (always available)
                                    ModernQuickActionButton(
                                        icon: "text.bubble.fill",
                                        title: "Suggestions",
                                        color: Color(red: 0.5, green: 0.3, blue: 0.8),
                                        isActive: true
                                    ) {
                                        showSuggestionBox = true
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                    }
                    .padding(.horizontal, 40)
                    .padding(.top, 20)
                    
                    // Custom Message at Bottom (if configured)
                    if let customMessage = appState.temple?.homeScreenConfig?.customMessage, !customMessage.isEmpty {
                        Text(customMessage)
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.5))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                            .padding(.top, 20)
                    }
                }
                .frame(maxWidth: 800) // Limit width for better centering
                
                Spacer()
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
        .sheet(isPresented: $showSuggestionBox) {
            SuggestionBoxView()
        }
    }
    
    // Computed properties for headers with defaults
    private var header1Text: String {
        if let temple = appState.temple {
            // Check if admin configured header1 in homeScreenConfig
            // For now, use default: "Welcome to Temple Name"
            return "Welcome to \(temple.name)"
        }
        return "Welcome"
    }
    
    private var header2Text: String? {
        if let temple = appState.temple {
            // Check if admin configured header2 in homeScreenConfig
            // For now, use default: address
            return temple.address
        }
        return nil
    }
}

// Modern quick action button (icon style like social media)
struct ModernQuickActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let isActive: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 36))
                    .foregroundColor(isActive ? .white : .gray.opacity(0.5))
                
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(isActive ? .white : .gray.opacity(0.5))
            }
            .frame(width: 110, height: 110)
            .background(isActive ? color : Color.gray.opacity(0.1))
            .cornerRadius(18)
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(isActive ? Color.clear : Color.gray.opacity(0.2), lineWidth: 1)
            )
            .shadow(color: isActive ? color.opacity(0.3) : Color.clear, radius: 8, x: 0, y: 4)
            .opacity(isActive ? 1.0 : 0.6)
        }
        .disabled(!isActive)
    }
}

// Helper functions for platform icons and colors
func iconForPlatform(_ platform: String) -> String {
    switch platform.lowercased() {
    case "facebook": return "f.circle.fill"
    case "instagram": return "camera.fill"
    case "twitter", "x": return "at"
    case "youtube": return "play.circle.fill"
    case "linkedin": return "link"
    default: return "link"
    }
}

func colorForPlatform(_ platform: String) -> Color {
    switch platform.lowercased() {
    case "facebook": return Color(red: 0.26, green: 0.40, blue: 0.70)
    case "instagram": return Color(red: 0.79, green: 0.31, blue: 0.50)
    case "twitter", "x": return Color(red: 0.11, green: 0.63, blue: 0.95)
    case "youtube": return Color(red: 1.0, green: 0.0, blue: 0.0)
    case "linkedin": return Color(red: 0.0, green: 0.47, blue: 0.71)
    default: return Color.blue
    }
}

// Keep existing helper views
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

struct SocialMediaItem: Identifiable {
    let id = UUID()
    let url: String
}

// Suggestion Box View
struct SuggestionBoxView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    @State private var suggestionText = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var errorMessage: String?
    @FocusState private var isTextFocused: Bool
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                Color(red: 0.98, green: 0.98, blue: 0.99)
                    .ignoresSafeArea()
                
                if showSuccess {
                    // Success view
                    VStack(spacing: 30) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(Color(red: 0.18, green: 0.64, blue: 0.33))
                        
                        Text("Thank You!")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                        
                        Text("Your anonymous suggestion has been submitted.")
                            .font(.system(size: 18))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                        
                        Button(action: {
                            dismiss()
                        }) {
                            Text("Done")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: 300)
                                .padding(.vertical, 16)
                                .background(Color(red: 0.5, green: 0.3, blue: 0.8))
                                .cornerRadius(12)
                        }
                        .padding(.top, 20)
                    }
                } else {
                    // Form view
                    ScrollView {
                        VStack(spacing: 30) {
                            // Header
                            VStack(spacing: 12) {
                                Image(systemName: "text.bubble.fill")
                                    .font(.system(size: 60))
                                    .foregroundColor(Color(red: 0.5, green: 0.3, blue: 0.8))
                                
                                Text("Anonymous Suggestion Box")
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                                
                                Text("Share your thoughts, ideas, or feedback anonymously")
                                    .font(.system(size: 16))
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            .padding(.top, 40)
                            .padding(.horizontal, 40)
                            
                            // Suggestion text field
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Your Suggestion")
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                                
                                ZStack(alignment: .topLeading) {
                                    if suggestionText.isEmpty {
                                        Text("Type your suggestion here...")
                                            .font(.system(size: 16))
                                            .foregroundColor(.gray.opacity(0.6))
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 16)
                                    }
                                    
                                    TextEditor(text: $suggestionText)
                                        .font(.system(size: 16))
                                        .frame(minHeight: 200)
                                        .focused($isTextFocused)
                                        .padding(8)
                                        .background(Color.white)
                                        .cornerRadius(12)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(
                                                    isTextFocused 
                                                        ? Color(red: 0.5, green: 0.3, blue: 0.8)
                                                        : Color.gray.opacity(0.3),
                                                    lineWidth: isTextFocused ? 2 : 1
                                                )
                                        )
                                }
                                
                                Text("Your suggestion is completely anonymous")
                                    .font(.system(size: 14))
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 40)
                            
                            // Error message
                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 14))
                                    .foregroundColor(.red)
                                    .padding(.horizontal, 40)
                            }
                            
                            // Submit button
                            Button(action: {
                                submitSuggestion()
                            }) {
                                HStack(spacing: 12) {
                                    if isSubmitting {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Image(systemName: "paperplane.fill")
                                            .font(.system(size: 18))
                                    }
                                    Text(isSubmitting ? "Submitting..." : "Submit Suggestion")
                                        .font(.system(size: 18, weight: .semibold))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 18)
                                .background(
                                    suggestionText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting
                                        ? Color.gray.opacity(0.4)
                                        : Color(red: 0.5, green: 0.3, blue: 0.8)
                                )
                                .cornerRadius(12)
                            }
                            .disabled(suggestionText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)
                            .padding(.horizontal, 40)
                            .padding(.bottom, 40)
                        }
                    }
                }
            }
            .navigationTitle("Suggestion Box")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func submitSuggestion() {
        let trimmedSuggestion = suggestionText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedSuggestion.isEmpty,
              let templeId = appState.temple?.id,
              let deviceId = appState.deviceId else {
            errorMessage = "Please enter a suggestion"
            return
        }
        
        isSubmitting = true
        errorMessage = nil
        
        Task {
            do {
                _ = try await APIService.shared.submitSuggestion(
                    templeId: templeId,
                    deviceId: deviceId,
                    suggestion: trimmedSuggestion
                )
                
                await MainActor.run {
                    isSubmitting = false
                    showSuccess = true
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    if let apiError = error as? APIError {
                        errorMessage = apiError.userFacingMessage
                    } else {
                        errorMessage = "Failed to submit suggestion. Please try again."
                    }
                }
            }
        }
    }
}

// Keep all existing event views unchanged
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
                
                CalendarGridView(
                    date: currentDate,
                    googleEvents: googleEvents,
                    localEvents: localEvents
                )
                
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
        let firstWeekday = calendar.component(.weekday, from: monthStart) - 1
        let daysInMonth = calendar.range(of: .day, in: .month, for: date)!.count
        
        VStack(spacing: 8) {
            HStack(spacing: 0) {
                ForEach(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                }
            }
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                ForEach(0..<firstWeekday, id: \.self) { _ in
                    Color.clear
                        .aspectRatio(1, contentMode: .fit)
                }
                
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
        for event in googleEvents {
            if let eventDate = event.start.displayDate,
               Calendar.current.isDate(eventDate, inSameDayAs: date) {
                events.append(event)
            }
        }
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
        allEvents.append(contentsOf: googleEvents)
        for localEvent in localEvents {
            if let date = parseDate(localEvent.date), date >= Date() {
                allEvents.append(localEvent)
            }
        }
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
