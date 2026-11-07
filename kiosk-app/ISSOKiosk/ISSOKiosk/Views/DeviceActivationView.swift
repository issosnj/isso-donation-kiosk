import SwiftUI

struct DeviceActivationView: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    @FocusState private var codeFieldFocused: Bool
    @State private var deviceCode = ""
    @State private var isActivating = false
    @State private var errorMessage: String?
    @State private var retryCount = 0
    @State private var showRetryButton = false
    @State private var keyboardDismissTask: Task<Void, Never>?
    private let maxRetries = 3

    var body: some View {
        ZStack {
            // Full-screen kiosk artwork. The reader ignores the safe area so the
            // photo reaches the bottom edge instead of leaving a white band.
            GeometryReader { geometry in
                background(geometry: geometry)
            }
            .ignoresSafeArea()

            GeometryReader { geometry in
                let scale = geometry.scaleWidthStable(1)
                let cardWidth = min(geometry.size.width - 72 * scale, 1040 * scale)
                let cardHeight = min(geometry.size.height - 72 * scale, 620 * scale)
                ZStack {
                    Color.clear
                        .contentShape(Rectangle())
                        .onTapGesture { codeFieldFocused = false }

                    activationCard(scale: scale, width: cardWidth, height: cardHeight)
                        .clipShape(RoundedRectangle(cornerRadius: 28 * scale, style: .continuous))
                        .shadow(color: Color(red: 0.45, green: 0.22, blue: 0.08).opacity(0.28), radius: 28 * scale, y: 16 * scale)
                }
            }
        }
        // Keep the card on the full display. Without this, the keyboard shrinks
        // the safe area and the card is remeasured and shifted upward.
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .onDisappear {
            keyboardDismissTask?.cancel()
            keyboardDismissTask = nil
        }
    }

    @ViewBuilder
    private func background(geometry: GeometryProxy) -> some View {
        if UIImage(named: "KioskBackground") != nil {
            Image("KioskBackground")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
        } else {
            ActivationPalette.canvas
        }
    }

    private func activationCard(scale: CGFloat, width: CGFloat, height: CGFloat) -> some View {
        let columnWidth = width / 2
        return HStack(spacing: 0) {
            formColumn(scale: scale)
                .frame(width: columnWidth, height: height)
                .clipped()
                .background(
                    Color.white
                        .onTapGesture { codeFieldFocused = false }
                )

            welcomePanel(scale: scale)
                .frame(width: columnWidth, height: height)
                .clipped()
                .contentShape(Rectangle())
                .onTapGesture { codeFieldFocused = false }
        }
        .frame(width: width, height: height)
    }

    private func formColumn(scale: CGFloat) -> some View {
        VStack(spacing: 0) {
            Text("Activate This Device")
                .font(.custom("Inter-SemiBold", size: 30 * scale))
                .foregroundColor(.black)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)

            Text("Enter the access code provided by your Mandir IT Team to get started.")
                .font(.custom("Inter-Regular", size: 18 * scale))
                .foregroundColor(.black)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.top, 12 * scale)

            if !networkMonitor.isConnected {
                statusBanner(
                    icon: "wifi.slash",
                    text: "No Internet Connection",
                    tint: ActivationPalette.burgundy,
                    scale: scale
                )
                .padding(.top, 16 * scale)
            }

            codeField(scale: scale)
                .padding(.top, 32 * scale)

            if let error = errorMessage {
                errorBlock(error, scale: scale)
                    .padding(.top, 14 * scale)
            }

            activateButton(scale: scale)
                .padding(.top, 22 * scale)

            helpNote(scale: scale)
                .padding(.top, 36 * scale)
        }
        .padding(.horizontal, 40 * scale)
        .padding(.vertical, 36 * scale)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        .offset(y: 28 * scale)
    }

    private func codeField(scale: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 12 * scale) {
            HStack(alignment: .firstTextBaseline) {
                Text("Access Code")
                    .font(.custom("Inter-SemiBold", size: 16 * scale))
                    .foregroundColor(ActivationPalette.ink)
                Spacer(minLength: 8 * scale)
                Text("8 characters")
                    .font(.custom("Inter-Regular", size: 14 * scale))
                    .foregroundColor(ActivationPalette.placeholder)
            }

            ZStack {
                HStack(spacing: 8 * scale) {
                    ForEach(0..<8, id: \.self) { index in
                        codeBox(index: index, scale: scale)
                    }
                }
                .accessibilityHidden(true)

                TextField("", text: $deviceCode)
                    .focused($codeFieldFocused)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled(true)
                    .keyboardType(.asciiCapable)
                    .submitLabel(.done)
                    .onSubmit { codeFieldFocused = false }
                    .font(.custom("Inter-SemiBold", size: 22 * scale))
                    .foregroundColor(.clear)
                    .tint(.clear)
                    .background(ActivationShortcutBarSuppression(isFocused: codeFieldFocused))
                    .frame(maxWidth: .infinity)
                    .frame(height: 58 * scale)
                    .accessibilityLabel("Access Code")
                    .onChange(of: deviceCode) { newValue in
                        let cleaned = String(
                            newValue
                                .uppercased()
                                .filter { $0.isLetter || $0.isNumber }
                                .prefix(8)
                        )
                        if cleaned != deviceCode {
                            deviceCode = cleaned
                        }
                        if errorMessage != nil {
                            errorMessage = nil
                            showRetryButton = false
                            retryCount = 0
                        }
                        scheduleKeyboardDismissal(for: cleaned)
                    }
            }
            .contentShape(Rectangle())
            .onTapGesture { codeFieldFocused = true }
        }
    }

    private func codeBox(index: Int, scale: CGFloat) -> some View {
        let characters = Array(deviceCode)
        let isFilled = index < characters.count
        let isActive = codeFieldFocused && index == characters.count && characters.count < 8
        return ZStack {
            RoundedRectangle(cornerRadius: 14 * scale, style: .continuous)
                .fill(isActive ? Color.white : ActivationPalette.codeBoxFill)
            RoundedRectangle(cornerRadius: 14 * scale, style: .continuous)
                .stroke(
                    isActive ? ActivationPalette.burgundy : ActivationPalette.fieldBorder,
                    lineWidth: isActive ? 2 : 1.25
                )
            if isFilled {
                Text(String(characters[index]))
                    .font(.custom("Inter-SemiBold", size: 22 * scale))
                    .foregroundColor(ActivationPalette.ink)
            } else if isActive {
                Capsule()
                    .fill(ActivationPalette.ink.opacity(0.8))
                    .frame(width: max(1.5, 1.6 * scale), height: 22 * scale)
                    .modifier(ActivationCaretBlink())
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 58 * scale)
        .shadow(color: isActive ? ActivationPalette.burgundy.opacity(0.16) : .clear, radius: 5 * scale)
    }

    /// Dismisses the keyboard shortly after a full code is entered. Does not activate.
    private func scheduleKeyboardDismissal(for code: String) {
        keyboardDismissTask?.cancel()
        keyboardDismissTask = nil
        guard code.count == 8 else { return }
        keyboardDismissTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 250_000_000)
            guard !Task.isCancelled else { return }
            guard deviceCode == code, deviceCode.count == 8, !isActivating else { return }
            codeFieldFocused = false
            keyboardDismissTask = nil
        }
    }

    private func errorBlock(_ error: String, scale: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 6 * scale) {
            HStack(alignment: .top, spacing: 8 * scale) {
                Image(systemName: "exclamationmark.triangle.fill")
                Text(error)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .font(.custom("Inter-SemiBold", size: 15 * scale))
            .foregroundColor(ActivationPalette.burgundy)

            if error.contains("No internet") || error.contains("network") || error.contains("connection") {
                Text("Check your Wi-Fi or network connection")
                    .font(.custom("Inter-Regular", size: 14 * scale))
                    .foregroundColor(ActivationPalette.subtitle)
            }

            if showRetryButton && retryCount < maxRetries {
                Button(action: retryActivation) {
                    HStack(spacing: 8 * scale) {
                        Image(systemName: "arrow.clockwise")
                        Text("Retry (\(retryCount + 1)/\(maxRetries))")
                    }
                    .font(.custom("Inter-SemiBold", size: 15 * scale))
                    .foregroundColor(ActivationPalette.burgundy)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14 * scale)
        .background(ActivationPalette.burgundy.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12 * scale, style: .continuous))
    }

    private func activateButton(scale: CGFloat) -> some View {
        Button(action: activateDevice) {
            Group {
                if isActivating {
                    HStack(spacing: 10 * scale) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        Text("Activating...")
                    }
                } else {
                    HStack(spacing: 8 * scale) {
                        Text("Activate Device")
                            .lineLimit(1)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 16 * scale, weight: .semibold))
                    }
                }
            }
            .font(.custom("Inter-SemiBold", size: 18 * scale))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56 * scale)
            .background(canActivate || isActivating ? ActivationPalette.burgundy : ActivationPalette.buttonIdle)
            .clipShape(RoundedRectangle(cornerRadius: 28 * scale, style: .continuous))
            .shadow(color: ActivationPalette.burgundy.opacity(canActivate ? 0.28 : 0), radius: 12 * scale, y: 8 * scale)
        }
        .buttonStyle(.plain)
        .disabled(!canActivate || isActivating)
    }

    private func welcomePanel(scale: CGFloat) -> some View {
        // Color.clear keeps the photo from expanding the card. The picture is
        // drawn in an overlay and clipped to this half of the card.
        Color.clear
            .overlay {
                ZStack {
                    if UIImage(named: "TemplePhoto") != nil {
                        Image("TemplePhoto")
                            .resizable()
                            .scaledToFill()
                    } else {
                        Image("KioskBackground")
                            .resizable()
                            .scaledToFill()
                    }

                    LinearGradient(
                        colors: [
                            ActivationPalette.redBright.opacity(0.82),
                            ActivationPalette.burgundy.opacity(0.76),
                            ActivationPalette.redDark.opacity(0.84)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )

                    VStack(spacing: 10 * scale) {
                        Text("WELCOME TO")
                            .font(.custom("Inter-SemiBold", size: 16 * scale))
                            .tracking(3.4 * scale)
                            .foregroundColor(.white.opacity(0.92))

                        Text("ISSO Kiosk")
                            .font(.system(size: 44 * scale, weight: .bold, design: .serif))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                            .minimumScaleFactor(0.7)

                        HStack(spacing: 14 * scale) {
                            welcomeRule(scale: scale)
                            Image("GoldenLotus")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 78 * scale, height: 44 * scale)
                            welcomeRule(scale: scale)
                        }
                        .padding(.top, 8 * scale)
                    }
                    .padding(.horizontal, 28 * scale)
                }
            }
            .clipped()
    }

    private func welcomeRule(scale: CGFloat) -> some View {
        Rectangle()
            .fill(Color(red: 232.0 / 255.0, green: 184.0 / 255.0, blue: 74.0 / 255.0))
            .frame(width: 64 * scale, height: 1.5)
    }

    private var canActivate: Bool {
        deviceCode.count == 8 && networkMonitor.isConnected && !isActivating
    }

    private func helpNote(scale: CGFloat) -> some View {
        HStack(alignment: .center, spacing: 14 * scale) {
            ZStack {
                Circle()
                    .stroke(ActivationPalette.burgundy.opacity(0.8), lineWidth: 1.4)
                    .frame(width: 40 * scale, height: 40 * scale)
                Image(systemName: "headphones")
                    .font(.system(size: 16 * scale, weight: .medium))
                    .foregroundColor(ActivationPalette.burgundy)
            }

            Rectangle()
                .fill(ActivationPalette.gold)
                .frame(width: 1.5, height: 36 * scale)

            VStack(alignment: .leading, spacing: 2 * scale) {
                Text("Need an Access Code?")
                    .font(.custom("Inter-SemiBold", size: 15 * scale))
                    .foregroundColor(ActivationPalette.burgundy)
                Text("Please contact your local Mandir IT Team for assistance.")
                    .font(.custom("Inter-Regular", size: 14 * scale))
                    .foregroundColor(ActivationPalette.subtitle)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16 * scale)
        .padding(.vertical, 12 * scale)
        .background(
            RoundedRectangle(cornerRadius: 14 * scale, style: .continuous)
                .fill(ActivationPalette.helpFill)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14 * scale, style: .continuous)
                .stroke(ActivationPalette.gold.opacity(0.35), lineWidth: 1)
        )
    }

    private func statusBanner(icon: String, text: String, tint: Color, scale: CGFloat) -> some View {
        HStack(spacing: 8 * scale) {
            Image(systemName: icon)
            Text(text)
                .font(.custom("Inter-SemiBold", size: 15 * scale))
        }
        .foregroundColor(tint)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10 * scale)
        .background(tint.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10 * scale, style: .continuous))
    }

    private func activateDevice() {
        keyboardDismissTask?.cancel()
        keyboardDismissTask = nil
        codeFieldFocused = false
        guard deviceCode.count == 8 else { return }
        guard networkMonitor.isConnected else {
            errorMessage = "No internet connection. Please check your network and try again."
            return
        }

        isActivating = true
        errorMessage = nil
        showRetryButton = false
        retryCount = 0

        performActivation()
    }

    private func performActivation() {
        Task {
            do {
                try await appState.activate(deviceCode: deviceCode)
            } catch let error as APIError {
                await MainActor.run {
                    errorMessage = error.errorDescription ?? error.localizedDescription
                    isActivating = false

                    if case .networkError = error,
                       case .noConnection = error,
                       case .httpError(let code) = error, code >= 500 {
                        if retryCount < maxRetries {
                            showRetryButton = true
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isActivating = false
                }
            }
        }
    }

    private func retryActivation() {
        guard retryCount < maxRetries else { return }
        guard networkMonitor.isConnected else {
            errorMessage = "No internet connection. Please check your network and try again."
            return
        }

        retryCount += 1
        isActivating = true
        errorMessage = nil

        Task {
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            performActivation()
        }
    }
}

private enum ActivationPalette {
    static let burgundy = Color(red: 147.0 / 255.0, green: 22.0 / 255.0, blue: 19.0 / 255.0)
    static let fieldBorder = Color(red: 212.0 / 255.0, green: 168.0 / 255.0, blue: 92.0 / 255.0)
    static let gold = Color(red: 196.0 / 255.0, green: 146.0 / 255.0, blue: 46.0 / 255.0)
    static let redBright = Color(red: 176.0 / 255.0, green: 36.0 / 255.0, blue: 32.0 / 255.0)
    static let redDark = Color(red: 61.0 / 255.0, green: 8.0 / 255.0, blue: 7.0 / 255.0)
    static let card = Color(red: 252.0 / 255.0, green: 247.0 / 255.0, blue: 241.0 / 255.0)
    static let canvas = Color(red: 252.0 / 255.0, green: 241.0 / 255.0, blue: 230.0 / 255.0)
    static let cardStroke = Color(red: 232.0 / 255.0, green: 214.0 / 255.0, blue: 190.0 / 255.0)
    static let helpFill = Color(red: 248.0 / 255.0, green: 240.0 / 255.0, blue: 228.0 / 255.0)
    static let ink = Color(red: 0.18, green: 0.13, blue: 0.11)
    static let subtitle = Color(red: 0.55, green: 0.58, blue: 0.62)
    static let placeholder = Color(red: 0.62, green: 0.60, blue: 0.57)
    static let codeBoxFill = Color(red: 252.0 / 255.0, green: 246.0 / 255.0, blue: 236.0 / 255.0)
    static let buttonIdle = Color(red: 206.0 / 255.0, green: 164.0 / 255.0, blue: 162.0 / 255.0)
}

private struct ActivationCaretBlink: ViewModifier {
    @State private var visible = true

    func body(content: Content) -> some View {
        content
            .opacity(visible ? 1 : 0)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.55).repeatForever(autoreverses: true)) {
                    visible = false
                }
            }
    }
}

/// Removes the iPad shortcut-bar Back, Forward, and Paste/Copy buttons from the access-code field.
private struct ActivationShortcutBarSuppression: UIViewRepresentable {
    var isFocused: Bool

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.isUserInteractionEnabled = false
        view.backgroundColor = .clear
        context.coordinator.installObserver()
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.host = uiView
        context.coordinator.suppress()
        if isFocused {
            context.coordinator.suppressSoon()
        }
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: Coordinator) {
        coordinator.removeObserver()
    }

    final class Coordinator {
        weak var host: UIView?
        private var observer: NSObjectProtocol?

        func installObserver() {
            guard observer == nil else { return }
            observer = NotificationCenter.default.addObserver(
                forName: UIResponder.keyboardWillChangeFrameNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                self?.suppressSoon()
            }
        }

        func removeObserver() {
            if let observer {
                NotificationCenter.default.removeObserver(observer)
            }
            observer = nil
        }

        func suppressSoon() {
            DispatchQueue.main.async { [weak self] in
                self?.suppress()
            }
        }

        func suppress() {
            guard let field = host?.nearestTextField() else { return }
            let item = field.inputAssistantItem
            item.leadingBarButtonGroups = []
            item.trailingBarButtonGroups = []
        }
    }
}

private extension UIView {
    func nearestTextField() -> UITextField? {
        var current: UIView? = self
        while let view = current {
            if let field = view as? UITextField { return field }
            if let field = view.findTextField(maxDepth: 6) { return field }
            current = view.superview
        }
        return nil
    }

    func findTextField(maxDepth: Int) -> UITextField? {
        if let field = self as? UITextField { return field }
        guard maxDepth > 0 else { return nil }
        for subview in subviews {
            if let field = subview.findTextField(maxDepth: maxDepth - 1) {
                return field
            }
        }
        return nil
    }
}
