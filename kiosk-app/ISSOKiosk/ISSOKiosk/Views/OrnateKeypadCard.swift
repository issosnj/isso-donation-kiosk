import SwiftUI

// Shared component for ornate golden frame card style
struct OrnateKeypadCard<Content: View>: View {
    let title: String
    let subtitle: String
    let content: Content
    let onCancel: () -> Void
    
    init(title: String, subtitle: String, onCancel: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.onCancel = onCancel
        self.content = content()
    }
    
    var body: some View {
        ZStack {
            // Blurred background (will be behind the card)
            Color.clear
                .ignoresSafeArea()
            
            // Main card with ornate frame
            VStack(spacing: 0) {
                // Card content
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 12) {
                        Text(title)
                            .font(.custom("Inter-SemiBold", size: 24))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        
                        Text(subtitle)
                            .font(.custom("Inter-SemiBold", size: 32))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                    }
                    .padding(.top, 20)
                    
                    content
                }
                .padding(.horizontal, 32)
                .padding(.vertical, 24)
                .background(
                    // Light cream/off-white background
                    Color(red: 0.99, green: 0.98, blue: 0.97)
                )
                .overlay(
                    // Ornate golden border
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.85, green: 0.7, blue: 0.3),
                                    Color(red: 0.95, green: 0.8, blue: 0.4),
                                    Color(red: 0.85, green: 0.7, blue: 0.3)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 3
                        )
                )
                .shadow(color: Color.black.opacity(0.15), radius: 20, x: 0, y: 10)
                .padding(.horizontal, 40)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Cancel") {
                    onCancel()
                }
                .font(.custom("Inter-Medium", size: 16))
                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color(red: 0.95, green: 0.95, blue: 0.95))
                .cornerRadius(8)
            }
        }
    }
}

// Helper for ornate continue button
struct OrnateContinueButton: View {
    let title: String
    let action: () -> Void
    let isEnabled: Bool
    
    var body: some View {
        Button(action: action) {
            ZStack {
                // Ornate golden frame background (if you have the asset)
                if UIImage(named: "DonateButtonBackground") != nil {
                    Image("DonateButtonBackground")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(height: 70)
                        .opacity(0.9)
                } else {
                    // Fallback gradient
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 0.85, green: 0.7, blue: 0.3),
                            Color(red: 0.95, green: 0.8, blue: 0.4)
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                }
                
                Text(title)
                    .font(.custom("Inter-Bold", size: 22))
                    .foregroundColor(.white)
                    .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 70)
            .cornerRadius(16)
        }
        .disabled(!isEnabled)
        .opacity(isEnabled ? 1.0 : 0.5)
    }
}

