import UIKit

/// Docked phone keypad matching the iPhone phone pad.
/// iPad's system `.phonePad` floats over the form. This input view is the field's keyboard, so it stays along the bottom.
final class DonorPhonePadInputView: UIInputView {
    var onInsertDigit: ((String) -> Void)?
    var onDelete: (() -> Void)?
    private let padHeight: CGFloat = 332

    init() {
        super.init(frame: CGRect(x: 0, y: 0, width: 640, height: padHeight), inputViewStyle: .keyboard)
        allowsSelfSizing = true
        backgroundColor = UIColor(red: 0.816, green: 0.835, blue: 0.855, alpha: 1)
        buildKeys()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var intrinsicContentSize: CGSize {
        CGSize(width: UIView.noIntrinsicMetric, height: padHeight)
    }

    private func buildKeys() {
        let grid = UIStackView()
        grid.axis = .vertical
        grid.distribution = .fillEqually
        grid.spacing = 10
        grid.translatesAutoresizingMaskIntoConstraints = false
        addSubview(grid)

        let digitRows: [[PhoneKey]] = [
            [.digit("1", ""), .digit("2", "ABC"), .digit("3", "DEF")],
            [.digit("4", "GHI"), .digit("5", "JKL"), .digit("6", "MNO")],
            [.digit("7", "PQRS"), .digit("8", "TUV"), .digit("9", "WXYZ")]
        ]
        for row in digitRows {
            let line = UIStackView()
            line.axis = .horizontal
            line.spacing = 8
            line.distribution = .fillEqually
            for key in row {
                line.addArrangedSubview(button(for: key))
            }
            grid.addArrangedSubview(line)
        }

        let symbol = button(for: .symbol)
        let zero = button(for: .digit("0", ""))
        let delete = button(for: .delete)
        let bottom = UIStackView(arrangedSubviews: [symbol, zero, delete])
        bottom.axis = .horizontal
        bottom.spacing = 8
        bottom.distribution = .fill
        grid.addArrangedSubview(bottom)

        let preferredWidth = grid.widthAnchor.constraint(equalToConstant: 560)
        preferredWidth.priority = .defaultHigh
        NSLayoutConstraint.activate([
            grid.centerXAnchor.constraint(equalTo: centerXAnchor),
            preferredWidth,
            grid.widthAnchor.constraint(lessThanOrEqualTo: widthAnchor, constant: -16),
            grid.topAnchor.constraint(equalTo: topAnchor, constant: 10),
            grid.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -14),
            symbol.widthAnchor.constraint(equalTo: delete.widthAnchor),
            zero.widthAnchor.constraint(equalTo: symbol.widthAnchor, multiplier: 2, constant: 8)
        ])
    }

    private func button(for key: PhoneKey) -> UIButton {
        let button = PhonePadKeyButton(type: .custom)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addAction(UIAction { [weak self] _ in
            self?.tap(key)
        }, for: .touchUpInside)
        button.accessibilityLabel = key.accessibilityLabel

        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 0
        stack.isUserInteractionEnabled = false
        stack.translatesAutoresizingMaskIntoConstraints = false
        button.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: button.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: button.centerYAnchor)
        ])

        switch key {
        case .digit(let number, let letters):
            stack.addArrangedSubview(numberLabel(number))
            if !letters.isEmpty {
                stack.addArrangedSubview(letterLabel(letters))
            }
        case .symbol:
            stack.addArrangedSubview(symbolLabel("+ ∗ #"))
        case .delete:
            let icon = UIImageView(image: UIImage(systemName: "delete.left"))
            icon.tintColor = .black
            icon.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 22, weight: .regular)
            icon.contentMode = .scaleAspectFit
            stack.addArrangedSubview(icon)
        }
        return button
    }

    private func numberLabel(_ text: String) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = .systemFont(ofSize: 32, weight: .regular)
        label.textColor = .black
        label.textAlignment = .center
        return label
    }

    private func letterLabel(_ text: String) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = .systemFont(ofSize: 11, weight: .semibold)
        label.textColor = UIColor(white: 0.35, alpha: 1)
        label.textAlignment = .center
        return label
    }

    private func symbolLabel(_ text: String) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = .systemFont(ofSize: 20, weight: .regular)
        label.textColor = .black
        label.textAlignment = .center
        return label
    }

    private func tap(_ key: PhoneKey) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        switch key {
        case .digit(let number, _):
            onInsertDigit?(number)
        case .symbol:
            break
        case .delete:
            onDelete?()
        }
    }

    private enum PhoneKey {
        case digit(String, String)
        case symbol
        case delete

        var accessibilityLabel: String {
            switch self {
            case .digit(let number, _):
                return number
            case .symbol:
                return "Symbols"
            case .delete:
                return "Delete"
            }
        }
    }
}

private final class PhonePadKeyButton: UIButton {
    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .white
        layer.cornerRadius = 8
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOpacity = 0.16
        layer.shadowOffset = CGSize(width: 0, height: 1)
        layer.shadowRadius = 0
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var isHighlighted: Bool {
        didSet {
            backgroundColor = isHighlighted ? UIColor(white: 0.86, alpha: 1) : .white
        }
    }
}
